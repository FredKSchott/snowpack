import chalk from 'chalk';
import {EventEmitter} from 'events';
import execa from 'execa';
import {promises as fs} from 'fs';
import glob from 'glob';
import mkdirp from 'mkdirp';
import npmRunPath from 'npm-run-path';
import path from 'path';
import rimraf from 'rimraf';
import {BuildScript} from '../config';
import {transformEsmImports} from '../rewrite-imports';
import {CommandOptions, ImportMap} from '../util';
import {
  getFileBuilderForWorker,
  wrapCssModuleResponse,
  wrapEsmProxyResponse,
  wrapJSModuleResponse,
} from './build-util';
import {paint} from './paint';
import srcFileExtensionMapping from './src-file-extension-mapping';
import {parcelBundlePlugin} from './parcel-bundle-plugin';
import {stopEsbuild} from './esbuildPlugin';

export async function command(commandOptions: CommandOptions) {
  const {cwd, config} = commandOptions;

  const messageBus = new EventEmitter();
  const relevantWorkers: BuildScript[] = [];
  const allBuildExtensions: string[] = [];

  const dependencyImportMapLoc = path.join(config.installOptions.dest, 'import-map.json');
  let dependencyImportMap: ImportMap = {imports: {}};
  try {
    dependencyImportMap = require(dependencyImportMapLoc);
  } catch (err) {
    // no import-map found, safe to ignore
  }

  let isBundled = config.devOptions.bundle;
  const isBundledHardcoded = isBundled !== undefined;
  if (!isBundledHardcoded) {
    try {
      require.resolve('parcel-bundler', {paths: [cwd]});
      isBundled = true;
    } catch (err) {
      isBundled = false;
    }
  }

  const buildDirectoryLoc = isBundled ? path.join(cwd, `.build`) : config.devOptions.out;
  const finalDirectoryLoc = config.devOptions.out;

  if (config.scripts.length <= 1) {
    console.error(chalk.red(`No build scripts found, so nothing to build.`));
    console.error(`See https://www.snowpack.dev/#build-scripts for help getting started.`);
    return;
  }

  rimraf.sync(finalDirectoryLoc);
  mkdirp.sync(finalDirectoryLoc);
  if (finalDirectoryLoc !== buildDirectoryLoc) {
    rimraf.sync(buildDirectoryLoc);
    mkdirp.sync(buildDirectoryLoc);
  }

  for (const workerConfig of config.scripts) {
    const {type, match} = workerConfig;
    if (type === 'build' || type === 'run' || type === 'mount' || type === 'proxy') {
      relevantWorkers.push(workerConfig);
    }
    if (type === 'build') {
      allBuildExtensions.push(...match);
    }
  }

  let bundleWorker: BuildScript = {
    id: 'bundle:*',
    type: 'bundle',
    match: ['*'],
    cmd: '(default) parcel',
    watch: undefined,
  };
  for (const workerConfig of config.scripts) {
    const {type} = workerConfig;
    if (type === 'bundle') {
      bundleWorker = workerConfig;
    }
  }
  relevantWorkers.push(bundleWorker);

  console.log = (...args) => {
    messageBus.emit('CONSOLE', {level: 'log', args});
  };
  console.warn = (...args) => {
    messageBus.emit('CONSOLE', {level: 'warn', args});
  };
  console.error = (...args) => {
    messageBus.emit('CONSOLE', {level: 'error', args});
  };
  let relDest = path.relative(cwd, config.devOptions.out);
  if (!relDest.startsWith(`..${path.sep}`)) {
    relDest = `.${path.sep}` + relDest;
  }
  paint(messageBus, relevantWorkers, {dest: relDest}, undefined);

  for (const workerConfig of relevantWorkers) {
    const {id, type} = workerConfig;
    if (type !== 'proxy') {
      continue;
    }
    messageBus.emit('WORKER_UPDATE', {
      id,
      state: ['SKIP', 'dim'],
    });
  }

  if (!isBundled) {
    messageBus.emit('WORKER_UPDATE', {
      id: bundleWorker.id,
      state: ['SKIP', 'dim'],
    });
  }

  const mountDirDetails: any[] = relevantWorkers
    .map((scriptConfig) => {
      const {id, type, args} = scriptConfig;
      if (type !== 'mount') {
        return false;
      }
      const dirDisk = path.resolve(cwd, args.fromDisk);
      const dirDest = path.resolve(buildDirectoryLoc, args.toUrl.replace(/^\//, ''));
      return [id, dirDisk, dirDest];
    })
    .filter(Boolean);

  const includeFileSets: [string, string, string[]][] = [];
  const allProxiedFiles = new Set<string>();
  const allCssModules = new Set<string>();
  for (const [id, dirDisk, dirDest] of mountDirDetails) {
    messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
    let allFiles;
    try {
      allFiles = glob.sync(`**/*`, {
        ignore: config.exclude,
        cwd: dirDisk,
        absolute: true,
        nodir: true,
        dot: true,
      });
      const allBuildNeededFiles: string[] = [];
      await Promise.all(
        allFiles.map(async (f) => {
          f = path.resolve(f); // this is necessary since glob.sync() returns paths with / on windows.  path.resolve() will switch them to the native path separator.
          if (
            allBuildExtensions.includes(path.extname(f).substr(1)) ||
            path.extname(f) === '.jsx' ||
            path.extname(f) === '.tsx' ||
            path.extname(f) === '.ts' ||
            path.extname(f) === '.js'
          ) {
            allBuildNeededFiles.push(f);
            return;
          }
          const outPath = f.replace(dirDisk, dirDest);
          mkdirp.sync(path.dirname(outPath));
          return fs.copyFile(f, outPath);
        }),
      );
      includeFileSets.push([dirDisk, dirDest, allBuildNeededFiles]);
      messageBus.emit('WORKER_COMPLETE', {id});
    } catch (err) {
      messageBus.emit('WORKER_MSG', {id, level: 'error', msg: err.toString()});
      messageBus.emit('WORKER_COMPLETE', {id, error: err});
    }
  }

  for (const workerConfig of relevantWorkers) {
    const {id, type, match} = workerConfig;
    if (type !== 'run') {
      continue;
    }
    messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
    const workerPromise = execa.command(workerConfig.cmd, {
      env: npmRunPath.env(),
      extendEnv: true,
      shell: true,
      cwd,
    });
    workerPromise.catch((err) => {
      messageBus.emit('WORKER_MSG', {id, level: 'error', msg: err.toString()});
      messageBus.emit('WORKER_COMPLETE', {id, error: err});
    });
    workerPromise.then(() => {
      messageBus.emit('WORKER_COMPLETE', {id, error: null});
    });
    const {stdout, stderr} = workerPromise;
    stdout?.on('data', (b) => {
      let stdOutput = b.toString();
      if (stdOutput.includes('\u001bc') || stdOutput.includes('\x1Bc')) {
        messageBus.emit('WORKER_RESET', {id});
        stdOutput = stdOutput.replace(/\x1Bc/, '').replace(/\u001bc/, '');
      }
      if (id.endsWith(':tsc')) {
        if (stdOutput.includes('\u001bc') || stdOutput.includes('\x1Bc')) {
          messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
        }
        if (/Watching for file changes./gm.test(stdOutput)) {
          messageBus.emit('WORKER_UPDATE', {id, state: 'WATCHING'});
        }
        const errorMatch = stdOutput.match(/Found (\d+) error/);
        if (errorMatch && errorMatch[1] !== '0') {
          messageBus.emit('WORKER_UPDATE', {id, state: ['ERROR', 'red']});
        }
      }
      messageBus.emit('WORKER_MSG', {id, level: 'log', msg: stdOutput});
    });
    stderr?.on('data', (b) => {
      messageBus.emit('WORKER_MSG', {id, level: 'error', msg: b.toString()});
    });
    await workerPromise;
  }

  const allBuiltFromFiles = new Set<string>();
  for (const workerConfig of relevantWorkers) {
    const {id, match, type} = workerConfig;
    if (type !== 'build' || match.length === 0) {
      continue;
    }

    messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
    for (const [dirDisk, dirDest, allFiles] of includeFileSets) {
      for (const f of allFiles) {
        const fileExtension = path.extname(f).substr(1);
        if (!match.includes(fileExtension)) {
          continue;
        }
        const fileContents = await fs.readFile(f, {encoding: 'utf8'});
        let fileBuilder = getFileBuilderForWorker(cwd, workerConfig);
        if (!fileBuilder) {
          continue;
        }
        let outPath = f.replace(dirDisk, dirDest);
        const extToFind = path.extname(f).substr(1);
        const extToReplace = srcFileExtensionMapping[extToFind];
        if (extToReplace) {
          outPath = outPath.replace(new RegExp(`${extToFind}$`), extToReplace!);
        }

        let {result: code, resources} = await fileBuilder({
          contents: fileContents,
          filePath: f,
          isDev: false,
        });
        if (!code) {
          continue;
        }
        const urlPath = outPath.substr(dirDest.length + 1);
        for (const plugin of config.plugins) {
          if (plugin.transform) {
            code =
              (await plugin.transform({contents: fileContents, urlPath, isDev: false}))?.result ||
              code;
          }
        }
        if (!code) {
          continue;
        }

        if (path.extname(outPath) === '.js') {
          if (resources?.css) {
            const cssOutPath = outPath.replace(/.js$/, '.css');
            await fs.mkdir(path.dirname(cssOutPath), {recursive: true});
            await fs.writeFile(cssOutPath, resources.css);
            code = `import './${path.basename(cssOutPath)}';\n` + code;
          }
          code = await transformEsmImports(code, (spec) => {
            if (spec.startsWith('http')) {
              return spec;
            }
            if (spec.startsWith('/') || spec.startsWith('./') || spec.startsWith('../')) {
              const ext = path.extname(spec).substr(1);
              if (!ext) {
                return spec + '.js';
              }
              const extToReplace = srcFileExtensionMapping[ext];
              if (extToReplace) {
                spec = spec.replace(new RegExp(`${ext}$`), extToReplace);
              }
              if (spec.endsWith('.module.css')) {
                const resolvedUrl = path.resolve(path.dirname(outPath), spec);
                allCssModules.add(resolvedUrl);
                spec = spec.replace('.module.css', '.css.module.js');
              } else if (!isBundled && (extToReplace || ext) !== 'js') {
                const resolvedUrl = path.resolve(path.dirname(outPath), spec);
                allProxiedFiles.add(resolvedUrl);
                spec = spec + '.proxy.js';
              }
              return spec;
            }
            if (dependencyImportMap.imports[spec]) {
              return path.posix.resolve(`/web_modules`, dependencyImportMap.imports[spec]);
            }
            let [missingPackageName, ...deepPackagePathParts] = spec.split('/');
            if (missingPackageName.startsWith('@')) {
              missingPackageName += '/' + deepPackagePathParts.shift();
            }
            messageBus.emit('MISSING_WEB_MODULE', {
              spec: spec,
              pkgName: missingPackageName,
            });
            return `/web_modules/${spec}.js`;
          });
          code = await wrapJSModuleResponse(code);
        }
        await fs.mkdir(path.dirname(outPath), {recursive: true});
        await fs.writeFile(outPath, code);
        allBuiltFromFiles.add(f);
      }
    }
    messageBus.emit('WORKER_COMPLETE', {id, error: null});
  }

  stopEsbuild();

  for (const proxiedFileLoc of allCssModules) {
    const proxiedCode = await fs.readFile(proxiedFileLoc, {encoding: 'utf8'});
    const proxiedExt = path.extname(proxiedFileLoc);
    const proxiedUrl = proxiedFileLoc.substr(buildDirectoryLoc.length);
    const proxyCode = await wrapCssModuleResponse(proxiedUrl, proxiedCode, proxiedExt);
    const proxyFileLoc = proxiedFileLoc.replace('.module.css', '.css.module.js');
    await fs.writeFile(proxyFileLoc, proxyCode, {encoding: 'utf8'});
  }
  for (const proxiedFileLoc of allProxiedFiles) {
    const proxiedCode = await fs.readFile(proxiedFileLoc, {encoding: 'utf8'});
    const proxiedExt = path.extname(proxiedFileLoc);
    const proxiedUrl = proxiedFileLoc.substr(buildDirectoryLoc.length);
    const proxyCode = wrapEsmProxyResponse(proxiedUrl, proxiedCode, proxiedExt);
    const proxyFileLoc = proxiedFileLoc + '.proxy.js';
    await fs.writeFile(proxyFileLoc, proxyCode, {encoding: 'utf8'});
  }

  if (!isBundled) {
    messageBus.emit('WORKER_COMPLETE', {id: bundleWorker.id, error: null});
    messageBus.emit('WORKER_UPDATE', {
      id: bundleWorker.id,
      state: ['SKIP', isBundledHardcoded ? 'dim' : 'yellow'],
    });
    if (!isBundledHardcoded) {
      messageBus.emit('WORKER_MSG', {
        id: bundleWorker.id,
        level: 'log',
        msg: `npm install --save-dev parcel-bundler \n\nInstall Parcel into your project to bundle for production.\nSet "devOptions.bundle = false" to remove this message.`,
      });
    }
  } else {
    const bundlePlugin =
      config.scripts.find((s) => s.type === 'bundle')?.plugin || parcelBundlePlugin(config, {});
    try {
      messageBus.emit('WORKER_UPDATE', {id: bundleWorker.id, state: ['RUNNING', 'yellow']});
      await bundlePlugin.bundle!({
        srcDirectory: buildDirectoryLoc,
        destDirectory: finalDirectoryLoc,
        jsFilePaths: allBuiltFromFiles,
        log: (msg) => {
          messageBus.emit('WORKER_MSG', {id: bundleWorker.id, level: 'log', msg});
        },
      });
      messageBus.emit('WORKER_COMPLETE', {id: bundleWorker.id, error: null});
    } catch (err) {
      messageBus.emit('WORKER_MSG', {
        id: bundleWorker.id,
        level: 'error',
        msg: err.toString(),
      });
      messageBus.emit('WORKER_COMPLETE', {id: bundleWorker.id, error: err});
    }
  }

  if (finalDirectoryLoc !== buildDirectoryLoc) {
    rimraf.sync(buildDirectoryLoc);
  }
}
