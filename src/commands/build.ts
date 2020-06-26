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
import {SnowpackBuildMap} from '../config';
import {transformFileImports} from '../rewrite-imports';
import {printStats} from '../stats-formatter';
import {CommandOptions} from '../util';
import {
  buildFile,
  generateEnvModule,
  wrapCssModuleResponse,
  wrapEsmProxyResponse,
} from './build-util';
import {stopEsbuild} from './esbuildPlugin';
import {createImportResolver} from './import-resolver';
import {getInstallTargets, run as installRunner} from './install';
import {paint} from './paint';

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

  const isBundledHardcoded = config.devOptions.bundle !== undefined;
  const isBundled = isBundledHardcoded ? !!config.devOptions.bundle : !!config.__bundler;

  const buildDirectoryLoc = isBundled ? path.join(cwd, `.build`) : config.devOptions.out;
  const internalFilesBuildLoc = path.join(buildDirectoryLoc, config.buildOptions.metaDir);
  const finalDirectoryLoc = config.devOptions.out;

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
  paint(messageBus, Object.keys(config.scripts), {dest: relDest}, undefined);

  if (!isBundled) {
    messageBus.emit('WORKER_UPDATE', {id: 'bundle*', state: ['SKIP', 'dim']});
  }

  // 1. run scripts
  for (const {id, cmd} of config.__runCommands) {
    messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
    const workerPromise = execa.command(cmd, {
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

  // 2. Write the `import.meta.env` contents file to disk
  await fs.writeFile(path.join(internalFilesBuildLoc, 'env.js'), generateEnvModule('production'));

  // 3. identify files to be built
  const simpleOutputMap: {[src: string]: string} = {}; // input -> output mapping
  for (const [fromDisk, toUrl] of Object.entries(config.__mountedDirs)) {
    const src = path.resolve(cwd, fromDisk);
    const dest = path.resolve(buildDirectoryLoc, toUrl.replace(/^\//, ''));

    const id = `mount:${fromDisk}`;
    messageBus.emit('WORKER_UPDATE', {id, state: ['RUNNING', 'yellow']});
    let allFiles;
    try {
      allFiles = glob.sync(`**/*`, {
        ignore: config.exclude,
        cwd: src,
        absolute: true,
        nodir: true,
        dot: true,
      });
      allFiles.forEach((f) => {
        simpleOutputMap[f] = f.replace(src, dest);
      });
    } catch (err) {
      messageBus.emit('WORKER_MSG', {id, level: 'error', msg: err.toString()});
      messageBus.emit('WORKER_COMPLETE', {id, error: err});
    }
  }

  // 4. transform files with plugins, and write to disk
  const jsFilesToScan: SnowpackBuildMap = {};
  messageBus.emit('WORKER_UPDATE', {id: 'build', state: ['RUNNING', 'yellow']});

  for (const [src, dest] of Object.entries(simpleOutputMap)) {
    // where all the magic happens
    const output = await buildFile(src, dest, {config, messageBus});

    // TODO: move this CSS handling into Svelte/Vue plugins
    const hasCSSOutput =
      Object.keys(output).findIndex((filePath) => filePath.endsWith('.css')) !== -1;

    for (const [outputPath, file] of Object.entries(output)) {
      if (file.baseExt === '.js') {
        // TODO: move Svelte/Vue CSS handling into official plugins
        if (hasCSSOutput) {
          file.code = file.code = `import './${path.basename(outputPath)}';\n` + file.code;
        }

        jsFilesToScan[outputPath] = file; // add JS files to import scanner
      }

      // write to disk
      await fs.mkdir(path.dirname(outputPath), {recursive: true});
      await fs.writeFile(outputPath, file.code);
    }
  }

  messageBus.emit('WORKER_COMPLETE', {id: 'build', error: null});

  stopEsbuild();

  const webModulesPath = config.__webModulesDir;
  const installDest = path.join(buildDirectoryLoc, webModulesPath);
  const installResult = await installOptimizedDependencies(
    jsFilesToScan,
    installDest,
    commandOptions,
  );
  if (!installResult.success || installResult.hasError) {
    process.exit(1);
  }

  const allProxiedFiles = new Set<string>();
  for (const [outLoc, file] of Object.entries(jsFilesToScan)) {
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
    messageBus.emit('WORKER_COMPLETE', {id: 'bundle:*', error: null});
    messageBus.emit('WORKER_UPDATE', {
      id: 'bundle:*',
      state: ['SKIP', isBundledHardcoded ? 'dim' : 'yellow'],
    });
    if (!isBundledHardcoded) {
      messageBus.emit('WORKER_MSG', {
        id: 'bundle:*',
        level: 'log',
        msg:
          `"plugins": ["@snowpack/plugin-webpack"]\n\n` +
          `Connect a bundler plugin to optimize your build for production.\n` +
          colors.dim(`Set "devOptions.bundle" configuration to false to remove this message.`),
      });
    }
  } else {
    try {
      messageBus.emit('WORKER_UPDATE', {id: 'bundle:*', state: ['RUNNING', 'yellow']});
      await config.__bundler!.bundle!({
        srcDirectory: buildDirectoryLoc,
        destDirectory: finalDirectoryLoc,
        jsFilePaths: jsFilesToScan,
        log: (msg) => {
          messageBus.emit('WORKER_MSG', {id: 'bundle:*', level: 'log', msg});
        },
      });
      messageBus.emit('WORKER_COMPLETE', {id: 'bundle:*', error: null});
    } catch (err) {
      messageBus.emit('WORKER_MSG', {id: 'bundle:*', level: 'error', msg: err.toString()});
      messageBus.emit('WORKER_COMPLETE', {id: 'bundle:*', error: err});
    }
  }

  if (finalDirectoryLoc !== buildDirectoryLoc) {
    rimraf.sync(buildDirectoryLoc);
  }
}
