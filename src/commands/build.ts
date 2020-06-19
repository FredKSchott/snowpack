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
import {BUILD_DEPENDENCIES_DIR, CommandOptions, ImportMap} from '../util';
import {
  generateEnvModule,
  getFileBuilderForWorker,
  wrapCssModuleResponse,
  wrapEsmProxyResponse,
  wrapImportMeta,
} from './build-util';
import {stopEsbuild} from './esbuildPlugin';
import {createImportResolver} from './import-resolver';
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

  let bundleWorker = config.scripts.find((s) => s.type === 'bundle');
  const isBundledHardcoded = config.devOptions.bundle !== undefined;
  const isBundled = isBundledHardcoded ? !!config.devOptions.bundle : !!bundleWorker;
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
  for (const workerConfig of relevantWorkers) {
    const {id, match, type} = workerConfig;
    if (type !== 'build' || match.length === 0) {
      continue;
    }

    messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
    for (const [dirDisk, dirDest, allFiles] of includeFileSets) {
      for (const fileLoc of allFiles) {
        const fileExtension = path.extname(fileLoc).substr(1);
        if (!match.includes(fileExtension)) {
          continue;
        }
        const fileContents = await fs.readFile(fileLoc, {encoding: 'utf8'});
        let fileBuilder = getFileBuilderForWorker(cwd, workerConfig, messageBus);
        if (!fileBuilder) {
          continue;
        }
        let outPath = fileLoc.replace(dirDisk, dirDest);
        const extToFind = path.extname(fileLoc).substr(1);
        const extToReplace = srcFileExtensionMapping[extToFind];
        if (extToReplace) {
          outPath = outPath.replace(new RegExp(`${extToFind}$`), extToReplace!);
        }

        const builtFile = await fileBuilder({
          contents: fileContents,
          filePath: fileLoc,
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
          const resolveImportSpecifier = createImportResolver({
            fileLoc,
            dependencyImportMap,
            isDev: false,
            isBundled,
            config,
          });
          code = await transformEsmImports(code, (spec) => {
            // Try to resolve the specifier to a known URL in the project
            const resolvedImportUrl = resolveImportSpecifier(spec);
            if (resolvedImportUrl) {
              // We treat ".proxy.js" files special: we need to make sure that they exist on disk
              // in the final build, so we mark them to be written to disk at the next step.
              if (resolvedImportUrl.endsWith('.proxy.js')) {
                allProxiedFiles.add(
                  resolvedImportUrl.startsWith('/')
                    ? path.resolve(cwd, spec)
                    : path.resolve(path.dirname(outPath), spec),
                );
              }
              return resolvedImportUrl;
            }
            // If that fails, return a placeholder import and attempt to resolve.
            let [missingPackageName, ...deepPackagePathParts] = spec.split('/');
            if (missingPackageName.startsWith('@')) {
              missingPackageName += '/' + deepPackagePathParts.shift();
            }
            messageBus.emit('MISSING_WEB_MODULE', {
              id: fileLoc,
              data: {
                spec: spec,
                pkgName: missingPackageName,
              },
            });
            // Sort of lazy, but we expect "MISSING_WEB_MODULE" to exit the build with an error.
            // So, just return the original import here since it will never be seen.
            return spec;
          });
          code = wrapImportMeta({code, env: true, hmr: false, config});
        }
        await fs.mkdir(path.dirname(outPath), {recursive: true});
        await fs.writeFile(outPath, code);
        allBuiltFromFiles.add(fileLoc);
      }
    }
    messageBus.emit('WORKER_COMPLETE', {id, error: null});
  }

  stopEsbuild();
  for (const proxiedFileLoc of allProxiedFiles) {
    const proxiedCode = await fs.readFile(proxiedFileLoc, {encoding: 'utf8'});
    const proxiedExt = path.extname(proxiedFileLoc);
    const proxiedUrl = proxiedFileLoc.substr(buildDirectoryLoc.length);
    const proxyCode = proxiedFileLoc.endsWith('.module.css')
      ? await wrapCssModuleResponse({
          url: proxiedUrl,
          code: proxiedCode,
          ext: proxiedExt,
          config,
        })
      : wrapEsmProxyResponse({
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
