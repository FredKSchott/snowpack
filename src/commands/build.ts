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
import {BUILD_DEPENDENCIES_DIR, CommandOptions, findMatchingMountScript, ImportMap} from '../util';
import {
  generateEnvModule,
  getFileBuilderForWorker,
  isDirectoryImport,
  wrapCssModuleResponse,
  wrapEsmProxyResponse,
  wrapImportMeta,
} from './build-util';
import {stopEsbuild} from './esbuildPlugin';
import {command as installCommand} from './install';
import {paint} from './paint';
import srcFileExtensionMapping from './src-file-extension-mapping';

export async function command(commandOptions: CommandOptions) {
  const {cwd, config} = commandOptions;

  // Start with a fresh install of your dependencies, for production
  commandOptions.config.installOptions.env.NODE_ENV = process.env.NODE_ENV || 'production';
  commandOptions.config.installOptions.dest = BUILD_DEPENDENCIES_DIR;
  commandOptions.config.installOptions.treeshake =
    commandOptions.config.installOptions.treeshake !== undefined
      ? commandOptions.config.installOptions.treeshake
      : true;
  const dependencyImportMapLoc = path.join(config.installOptions.dest, 'import-map.json');

  // Start with a fresh install of your dependencies, always.
  console.log(chalk.yellow('! rebuilding dependencies...'));
  await installCommand(commandOptions);

  const messageBus = new EventEmitter();
  const relevantWorkers: BuildScript[] = [];
  const allBuildExtensions: string[] = [];

  let dependencyImportMap: ImportMap = {imports: {}};
  try {
    dependencyImportMap = require(dependencyImportMapLoc);
  } catch (err) {
    // no import-map found, safe to ignore
  }

  for (const workerConfig of config.scripts) {
    const {type, match} = workerConfig;
    if (type === 'build' || type === 'run' || type === 'mount' || type === 'bundle') {
      relevantWorkers.push(workerConfig);
    }
    if (type === 'build') {
      allBuildExtensions.push(...match);
    }
  }

  let isBundled = config.devOptions.bundle;
  let bundleWorker = config.scripts.find((s) => s.type === 'bundle');
  const isBundledHardcoded = isBundled !== undefined;
  if (!isBundledHardcoded) {
    isBundled = !!bundleWorker;
  }
  if (!bundleWorker) {
    bundleWorker = {
      id: 'bundle:*',
      type: 'bundle',
      match: ['*'],
      cmd: '',
      watch: undefined,
    };
    relevantWorkers.push(bundleWorker);
  }

  const buildDirectoryLoc = isBundled ? path.join(cwd, `.build`) : config.devOptions.out;
  const internalFilesBuildLoc = path.join(buildDirectoryLoc, config.buildOptions.metaDir);
  const finalDirectoryLoc = config.devOptions.out;

  if (config.scripts.length <= 1) {
    console.error(chalk.red(`No build scripts found, so nothing to build.`));
    console.error(`See https://www.snowpack.dev/#build-scripts for help getting started.`);
    return;
  }

  rimraf.sync(buildDirectoryLoc);
  mkdirp.sync(buildDirectoryLoc);
  mkdirp.sync(internalFilesBuildLoc);
  if (finalDirectoryLoc !== buildDirectoryLoc) {
    rimraf.sync(finalDirectoryLoc);
    mkdirp.sync(finalDirectoryLoc);
  }

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

  if (!isBundled) {
    messageBus.emit('WORKER_UPDATE', {
      id: bundleWorker.id,
      state: ['SKIP', 'dim'],
    });
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

  // Write the `import.meta.env` contents file to disk
  await fs.writeFile(path.join(internalFilesBuildLoc, 'env.js'), generateEnvModule('production'));

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
        ignore: id === 'mount:web_modules' ? [] : config.exclude,
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
            !f.startsWith(commandOptions.config.installOptions.dest) &&
            (allBuildExtensions.includes(path.extname(f).substr(1)) ||
              path.extname(f) === '.jsx' ||
              path.extname(f) === '.tsx' ||
              path.extname(f) === '.ts' ||
              path.extname(f) === '.js')
          ) {
            allBuildNeededFiles.push(f);
            return;
          }
          const outPath = f.replace(dirDisk, dirDest);
          mkdirp.sync(path.dirname(outPath));

          // replace %PUBLIC_URL% in HTML files
          if (path.extname(f) === '.html') {
            let code = await fs.readFile(f, 'utf8');
            code = code.replace(/%PUBLIC_URL%\/?/g, config.buildOptions.baseUrl);
            return fs.writeFile(outPath, code, 'utf8');
          }
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

  const allBuiltFromFiles = new Set<string>();

  const webModulesScript = config.scripts.find((script) => script.id === 'mount:web_modules');
  const webModulesLoc = webModulesScript ? (webModulesScript.args.toUrl as string) : '/web_modules';

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
        let fileBuilder = getFileBuilderForWorker(cwd, workerConfig, messageBus);
        if (!fileBuilder) {
          continue;
        }
        let outPath = f.replace(dirDisk, dirDest);
        const extToFind = path.extname(f).substr(1);
        const extToReplace = srcFileExtensionMapping[extToFind];
        if (extToReplace) {
          outPath = outPath.replace(new RegExp(`${extToFind}$`), extToReplace!);
        }

        const builtFile = await fileBuilder({
          contents: fileContents,
          filePath: f,
          isDev: false,
        });
        if (!builtFile) {
          continue;
        }
        let {result: code, resources} = builtFile;
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
            let mountScript = findMatchingMountScript(config.scripts, spec);
            if (mountScript) {
              let {fromDisk, toUrl} = mountScript.args;
              spec = spec.replace(fromDisk, toUrl);
            }
            if (spec.startsWith('/') || spec.startsWith('./') || spec.startsWith('../')) {
              const ext = path.extname(spec).substr(1);
              if (!ext) {
                if (isDirectoryImport(f, spec)) {
                  return spec + '/index.js';
                } else {
                  return spec + '.js';
                }
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
              let resolvedImport = path.posix.join(
                config.buildOptions.baseUrl,
                webModulesLoc,
                dependencyImportMap.imports[spec],
              );
              const extName = path.extname(resolvedImport);
              if (!isBundled && extName && extName !== '.js') {
                resolvedImport = resolvedImport + '.proxy.js';
              }
              return resolvedImport;
            }
            let [missingPackageName, ...deepPackagePathParts] = spec.split('/');
            if (missingPackageName.startsWith('@')) {
              missingPackageName += '/' + deepPackagePathParts.shift();
            }
            messageBus.emit('MISSING_WEB_MODULE', {
              id: f,
              data: {
                spec: spec,
                pkgName: missingPackageName,
              },
            });
            return path.posix.join(config.buildOptions.baseUrl, webModulesLoc, `${spec}.js`);
          });
          code = wrapImportMeta({code, env: true, hmr: false, config});
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
    const proxyCode = await wrapCssModuleResponse({
      url: proxiedUrl,
      code: proxiedCode,
      ext: proxiedExt,
      config,
    });
    const proxyFileLoc = proxiedFileLoc.replace('.module.css', '.css.module.js');
    await fs.writeFile(proxyFileLoc, proxyCode, {encoding: 'utf8'});
  }
  for (const proxiedFileLoc of allProxiedFiles) {
    const proxiedCode = await fs.readFile(proxiedFileLoc, {encoding: 'utf8'});
    const proxiedExt = path.extname(proxiedFileLoc);
    const proxiedUrl = proxiedFileLoc.substr(buildDirectoryLoc.length);
    const proxyCode = wrapEsmProxyResponse({
      url: proxiedUrl,
      code: proxiedCode,
      ext: proxiedExt,
      config,
    });
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
        msg:
          `"plugins": ["@snowpack/plugin-webpack"]\n\n` +
          `Connect a bundler plugin to optimize your build for production.\n` +
          chalk.dim(`Set "devOptions.bundle" configuration to false to remove this message.`),
      });
    }
  } else {
    try {
      messageBus.emit('WORKER_UPDATE', {id: bundleWorker.id, state: ['RUNNING', 'yellow']});
      await bundleWorker?.plugin!.bundle!({
        srcDirectory: buildDirectoryLoc,
        destDirectory: finalDirectoryLoc,
        jsFilePaths: allBuiltFromFiles,
        log: (msg) => {
          messageBus.emit('WORKER_MSG', {id: bundleWorker!.id, level: 'log', msg});
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
