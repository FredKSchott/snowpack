import merge from 'deepmerge';
import {EventEmitter} from 'events';
import execa from 'execa';
import {promises as fs} from 'fs';
import glob from 'glob';
import * as colors from 'kleur/colors';
import mkdirp from 'mkdirp';
import npmRunPath from 'npm-run-path';
import path from 'path';
import rimraf from 'rimraf';
import {BuildScript, SnowpackBuildMap} from '../config';
import {transformFileImports} from '../rewrite-imports';
import {printStats} from '../stats-formatter';
import {CommandOptions, getExt} from '../util';
import {
  generateEnvModule,
  getFileBuilderForWorker,
  wrapCssModuleResponse,
  wrapEsmProxyResponse,
  wrapImportMeta,
} from './build-util';
import {stopEsbuild} from './esbuildPlugin';
import {createImportResolver} from './import-resolver';
import {getInstallTargets, run as installRunner} from './install';
import {paint} from './paint';
import srcFileExtensionMapping from './src-file-extension-mapping';

async function installOptimizedDependencies(
  allFilesToResolveImports: SnowpackBuildMap,
  installDest: string,
  commandOptions: CommandOptions,
) {
  console.log(colors.yellow('! optimizing dependencies...'));
  const installConfig = merge(commandOptions.config, {
    installOptions: {
      dest: installDest,
      env: {NODE_ENV: process.env.NODE_ENV || 'production'},
      treeshake: commandOptions.config.installOptions.treeshake ?? true,
    },
  });
  // 1. Scan imports from your final built JS files.
  const installTargets = await getInstallTargets(
    installConfig,
    Object.values(allFilesToResolveImports),
  );
  // 2. Install dependencies, based on the scan of your final build.
  const installResult = await installRunner({
    ...commandOptions,
    installTargets,
    config: installConfig,
  });
  // 3. Print stats immediate after install output.
  if (installResult.stats) {
    console.log(printStats(installResult.stats));
  }
  return installResult;
}

export async function command(commandOptions: CommandOptions) {
  const {cwd, config} = commandOptions;
  const messageBus = new EventEmitter();
  const relevantWorkers: BuildScript[] = [];
  const allBuildExtensions: string[] = [];

  for (const workerConfig of config.scripts) {
    const {id, type, match} = workerConfig;
    // web_modules dependencies are now installed directly into the build directory,
    // instead of being copied like a traditional mount. This is required until we
    // move the "web_modules" destination configuration out of the "scripts" config.
    if (id === 'mount:web_modules') {
      continue;
    }
    if (type === 'build' || type === 'run' || type === 'mount' || type === 'bundle') {
      relevantWorkers.push(workerConfig);
    }
    if (type === 'build') {
      allBuildExtensions.push(...match);
    }
  }

  let bundleWorker = config.scripts.find((s) => s.type === 'bundle');
  let installWorker = config.scripts.find((s) => s.id === 'mount:web_modules')!;
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
    console.error(colors.red(`No build scripts found, so nothing to build.`));
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
    const {id, type} = workerConfig;
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
      if (id === 'mount:web_modules') {
        return false;
      }
      if (type !== 'mount') {
        return false;
      }
      const dirDisk = path.resolve(cwd, args.fromDisk);
      const dirDest = path.resolve(buildDirectoryLoc, args.toUrl.replace(/^\//, ''));
      return [id, dirDisk, dirDest];
    })
    .filter(Boolean);

  const includeFileSets: [string, string, string[]][] = [];
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
          const {baseExt} = getExt(f);
          if (
            allBuildExtensions.includes(baseExt) ||
            baseExt === '.jsx' ||
            baseExt === '.tsx' ||
            baseExt === '.ts' ||
            baseExt === '.js'
          ) {
            allBuildNeededFiles.push(f);
            return;
          }
          const outPath = f.replace(dirDisk, dirDest);
          mkdirp.sync(path.dirname(outPath));

          // replace %PUBLIC_URL% in HTML files
          if (baseExt === '.html') {
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
  const allFilesToResolveImports: SnowpackBuildMap = {};
  for (const workerConfig of relevantWorkers) {
    const {id, match, type} = workerConfig;
    if (type !== 'build' || match.length === 0) {
      continue;
    }

    messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
    for (const [dirDisk, dirDest, allFiles] of includeFileSets) {
      for (const locOnDisk of allFiles) {
        const inputExt = getExt(locOnDisk);
        if (!match.includes(inputExt.baseExt) && !match.includes(inputExt.expandedExt)) {
          continue;
        }
        const fileContents = await fs.readFile(locOnDisk, {encoding: 'utf8'});
        let fileBuilder = getFileBuilderForWorker(cwd, workerConfig, messageBus);
        if (!fileBuilder) {
          continue;
        }
        let outLoc = locOnDisk.replace(dirDisk, dirDest);
        const extToReplace = srcFileExtensionMapping[inputExt.baseExt];
        if (extToReplace) {
          outLoc = outLoc.replace(new RegExp(`\\${inputExt.baseExt}$`), extToReplace!);
        }

        const builtFile = await fileBuilder({
          contents: fileContents,
          filePath: locOnDisk,
          isDev: false,
        });
        if (!builtFile) {
          continue;
        }
        let {result: code, resources} = builtFile;
        const urlPath = outLoc.substr(dirDest.length + 1);
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

        allBuiltFromFiles.add(locOnDisk);

        const {baseExt, expandedExt} = getExt(outLoc);
        switch (baseExt) {
          case '.js': {
            if (resources?.css) {
              const cssOutPath = outLoc.replace(/.js$/, '.css');
              await fs.mkdir(path.dirname(cssOutPath), {recursive: true});
              await fs.writeFile(cssOutPath, resources.css);
              code = `import './${path.basename(cssOutPath)}';\n` + code;
            }
            code = wrapImportMeta({code, env: true, hmr: false, config});
            allFilesToResolveImports[outLoc] = {baseExt, expandedExt, code, locOnDisk};
            break;
          }
          case '.html': {
            allFilesToResolveImports[outLoc] = {baseExt, expandedExt, code, locOnDisk};
            break;
          }
          default: {
            await fs.mkdir(path.dirname(outLoc), {recursive: true});
            await fs.writeFile(outLoc, code);
            break;
          }
        }
      }
    }
    messageBus.emit('WORKER_COMPLETE', {id, error: null});
  }

  stopEsbuild();

  const webModulesPath = installWorker.args.toUrl;
  const installDest = path.join(buildDirectoryLoc, webModulesPath);
  const installResult = await installOptimizedDependencies(
    allFilesToResolveImports,
    installDest,
    commandOptions,
  );
  if (!installResult.success || installResult.hasError) {
    process.exit(1);
  }

  const allProxiedFiles = new Set<string>();
  for (const [outLoc, file] of Object.entries(allFilesToResolveImports)) {
    const resolveImportSpecifier = createImportResolver({
      fileLoc: file.locOnDisk!, // we’re confident these are reading from disk because we just read them
      webModulesPath,
      dependencyImportMap: installResult.importMap,
      isDev: false,
      isBundled,
      config,
    });
    const resolvedCode = await transformFileImports(file, (spec) => {
      // Try to resolve the specifier to a known URL in the project
      const resolvedImportUrl = resolveImportSpecifier(spec);
      if (resolvedImportUrl) {
        // We treat ".proxy.js" files special: we need to make sure that they exist on disk
        // in the final build, so we mark them to be written to disk at the next step.
        if (resolvedImportUrl.endsWith('.proxy.js')) {
          allProxiedFiles.add(
            resolvedImportUrl.startsWith('/')
              ? path.resolve(cwd, spec)
              : path.resolve(path.dirname(outLoc), spec),
          );
        }
        return resolvedImportUrl;
      }
      return spec;
    });
    await fs.mkdir(path.dirname(outLoc), {recursive: true});
    await fs.writeFile(outLoc, resolvedCode);
  }

  for (const proxiedFileLoc of allProxiedFiles) {
    const proxiedCode = await fs.readFile(proxiedFileLoc, {encoding: 'utf8'});
    const proxiedExt = path.extname(proxiedFileLoc);
    const proxiedUrl = proxiedFileLoc.substr(buildDirectoryLoc.length).replace(/\\/g, '/'); // replace backslashes on Windows
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
          colors.dim(`Set "devOptions.bundle" configuration to false to remove this message.`),
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
