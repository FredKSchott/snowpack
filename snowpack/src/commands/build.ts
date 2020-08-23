import merge from 'deepmerge';
import {promises as fs} from 'fs';
import glob from 'glob';
import * as colors from 'kleur/colors';
import mkdirp from 'mkdirp';
import PQueue from 'p-queue';
import path from 'path';
import {performance} from 'perf_hooks';
import rimraf from 'rimraf';
import url from 'url';
import {
  generateEnvModule,
  wrapHtmlResponse,
  wrapImportMeta,
  wrapImportProxy,
} from '../build/build-import-proxy';
import {buildFile, runPipelineCleanupStep, runPipelineOptimizeStep} from '../build/build-pipeline';
import {createImportResolver} from '../build/import-resolver';
import {logger} from '../logger';
import {transformFileImports} from '../rewrite-imports';
import {CommandOptions, ImportMap, SnowpackConfig, SnowpackSourceFile} from '../types/snowpack';
import {
  cssSourceMappingURL,
  getEncodingType,
  jsSourceMappingURL,
  relativeURL,
  removeLeadingSlash,
  replaceExt,
} from '../util';
import {getInstallTargets, run as installRunner} from './install';

const CONCURRENT_WORKERS = require('os').cpus().length;

async function installOptimizedDependencies(
  scannedFiles: SnowpackSourceFile[],
  installDest: string,
  commandOptions: CommandOptions,
) {
  const installConfig = merge(commandOptions.config, {
    installOptions: {
      dest: installDest,
      env: {NODE_ENV: process.env.NODE_ENV || 'production'},
      treeshake: commandOptions.config.buildOptions.watch
        ? false
        : commandOptions.config.installOptions.treeshake ?? true,
    },
  });
  // Unlike dev (where we scan from source code) the built output guarantees that we
  // will can scan all used entrypoints. Set to `[]` to improve tree-shaking performance.
  installConfig.knownEntrypoints = [];
  // 1. Scan imports from your final built JS files.
  const installTargets = await getInstallTargets(installConfig, scannedFiles);
  // 2. Install dependencies, based on the scan of your final build.
  const installResult = await installRunner({
    ...commandOptions,
    installTargets,
    config: installConfig,
  });
  return installResult;
}

/**
 * FileBuilder - This class is responsible for building a file. It is broken into
 * individual stages so that the entire application build process can be tackled
 * in stages (build -> resolve -> write to disk).
 */
class FileBuilder {
  output: Record<string, string | Buffer> = {};
  filesToResolve: Record<string, SnowpackSourceFile> = {};
  filesToProxy: string[] = [];

  readonly filepath: string;
  readonly outDir: string;
  readonly config: SnowpackConfig;

  constructor({
    filepath,
    outDir,
    config,
  }: {
    filepath: string;
    outDir: string;
    config: SnowpackConfig;
  }) {
    this.filepath = filepath;
    this.outDir = outDir;
    this.config = config;
  }

  async buildFile() {
    this.filesToResolve = {};
    const srcExt = path.extname(this.filepath);
    const builtFileOutput = await buildFile(this.filepath, {
      plugins: this.config.plugins,
      isDev: false,
      isHmrEnabled: false,
      sourceMaps: this.config.buildOptions.sourceMaps,
    });
    for (const [fileExt, buildResult] of Object.entries(builtFileOutput)) {
      let {code, map} = buildResult;
      if (!code) {
        continue;
      }

      const outFilename = replaceExt(path.basename(this.filepath), srcExt, fileExt);
      const outLoc = path.join(this.outDir, outFilename);
      const sourceMappingURL = outFilename + '.map';
      if (typeof code === 'string') {
        switch (fileExt) {
          case '.css': {
            if (map) code = cssSourceMappingURL(code, sourceMappingURL);
            this.filesToResolve[outLoc] = {
              baseExt: fileExt,
              expandedExt: fileExt,
              contents: code,
              locOnDisk: this.filepath,
            };
            break;
          }

          case '.js': {
            if (builtFileOutput['.css']) {
              // inject CSS if imported directly
              const cssFilename = outFilename.replace(/\.js$/i, '.css');
              code = `import './${cssFilename}';\n` + code;
            }
            code = wrapImportMeta({code, env: true, hmr: false, config: this.config});
            if (map) code = jsSourceMappingURL(code, sourceMappingURL);
            this.filesToResolve[outLoc] = {
              baseExt: fileExt,
              expandedExt: fileExt,
              contents: code,
              locOnDisk: this.filepath,
            };
            break;
          }

          case '.html': {
            code = wrapHtmlResponse({
              code,
              hmr: false,
              isDev: false,
              config: this.config,
              mode: 'production',
            });
            this.filesToResolve[outLoc] = {
              baseExt: fileExt,
              expandedExt: fileExt,
              contents: code,
              locOnDisk: this.filepath,
            };
            break;
          }
        }
      }

      this.output[outLoc] = code;
      if (map) {
        this.output[path.join(this.outDir, sourceMappingURL)] = map;
      }
    }
  }

  async resolveImports(importMap: ImportMap) {
    let isSuccess = true;
    this.filesToProxy = [];
    for (const [outLoc, file] of Object.entries(this.filesToResolve)) {
      const resolveImportSpecifier = createImportResolver({
        fileLoc: file.locOnDisk!, // we’re confident these are reading from disk because we just read them
        dependencyImportMap: importMap,
        config: this.config,
      });
      const resolvedCode = await transformFileImports(file, (spec) => {
        // Try to resolve the specifier to a known URL in the project
        let resolvedImportUrl = resolveImportSpecifier(spec);
        // NOTE: If the import cannot be resolved, we'll need to re-install
        // your dependencies. We don't support this yet, but we will.
        // Until supported, just exit here.
        if (!resolvedImportUrl) {
          isSuccess = false;
          logger.error(`${file.locOnDisk} - Could not resolve unkonwn import "${spec}".`);
          return spec;
        }
        // Ignore "http://*" imports
        if (url.parse(resolvedImportUrl).protocol) {
          return spec;
        }
        // Handle normal "./" & "../" import specifiers
        const extName = path.extname(resolvedImportUrl);
        const isProxyImport = extName && extName !== '.js';
        const isAbsoluteUrlPath = path.posix.isAbsolute(resolvedImportUrl);
        let resolvedImportPath = removeLeadingSlash(path.normalize(resolvedImportUrl));
        // We treat ".proxy.js" files special: we need to make sure that they exist on disk
        // in the final build, so we mark them to be written to disk at the next step.
        if (isProxyImport) {
          if (isAbsoluteUrlPath) {
            this.filesToProxy.push(path.resolve(this.config.devOptions.out, resolvedImportPath));
          } else {
            this.filesToProxy.push(path.resolve(path.dirname(outLoc), resolvedImportPath));
          }
        }

        if (isProxyImport) {
          resolvedImportPath = resolvedImportPath + '.proxy.js';
          resolvedImportUrl = resolvedImportUrl + '.proxy.js';
        }

        // When dealing with an absolute import path, we need to honor the baseUrl
        if (isAbsoluteUrlPath) {
          resolvedImportUrl = relativeURL(
            path.dirname(outLoc),
            path.resolve(this.config.devOptions.out, resolvedImportPath),
          );
        }
        // Make sure that a relative URL always starts with "./"
        if (!resolvedImportUrl.startsWith('.') && !resolvedImportUrl.startsWith('/')) {
          resolvedImportUrl = './' + resolvedImportUrl;
        }
        return resolvedImportUrl;
      });
      this.output[outLoc] = resolvedCode;
    }
    return isSuccess;
  }

  async writeToDisk() {
    mkdirp.sync(this.outDir);
    for (const [outLoc, code] of Object.entries(this.output)) {
      await fs.writeFile(outLoc, code, getEncodingType(path.extname(outLoc)));
    }
  }

  async writeProxyToDisk(originalFileLoc: string) {
    const proxiedCode = this.output[originalFileLoc];
    const importProxyFileLoc = originalFileLoc + '.proxy.js';
    const proxiedUrl = originalFileLoc
      .substr(this.config.devOptions.out.length)
      .replace(/\\/g, '/');
    const proxyCode = await wrapImportProxy({
      url: proxiedUrl,
      code: proxiedCode,
      hmr: false,
      config: this.config,
    });
    await fs.writeFile(importProxyFileLoc, proxyCode, getEncodingType('.js'));
  }
}

export async function command(commandOptions: CommandOptions) {
  const {cwd, config} = commandOptions;

  const buildDirectoryLoc = config.devOptions.out;
  const internalFilesBuildLoc = path.join(buildDirectoryLoc, config.buildOptions.metaDir);
  const mountedDirectories: [string, string][] = Object.entries(config.mount).map(
    ([fromDisk, toUrl]) => {
      return [
        path.resolve(cwd, fromDisk),
        path.resolve(buildDirectoryLoc, removeLeadingSlash(toUrl)),
      ];
    },
  );

  if (config.buildOptions.clean) {
    rimraf.sync(buildDirectoryLoc);
  }
  mkdirp.sync(buildDirectoryLoc);
  mkdirp.sync(internalFilesBuildLoc);

  for (const runPlugin of config.plugins) {
    if (runPlugin.run) {
      await runPlugin
        .run({
          isDev: false,
          isHmrEnabled: false,
          // @ts-ignore: internal API only
          log: (msg, data: {msg: string} = {}) => {
            if (msg === 'WORKER_MSG') {
              logger.info(`[${runPlugin.name}] ${data.msg.trim()}`);
            }
          },
        })
        .catch((err) => {
          logger.error(`[${runPlugin.name}] ${err}`);
        });
    }
  }

  // Write the `import.meta.env` contents file to disk
  await fs.writeFile(path.join(internalFilesBuildLoc, 'env.js'), generateEnvModule('production'));

  logger.info(colors.yellow('! building source…'));
  const buildStart = performance.now();
  const buildPipelineFiles: Record<string, FileBuilder> = {};

  /** Install all needed dependencies, based on the master buildPipelineFiles list.  */
  async function installDependencies() {
    const scannedFiles = Object.values(buildPipelineFiles)
      .map((f) => Object.values(f.filesToResolve))
      .reduce((flat, item) => flat.concat(item), []);
    const installDest = path.join(buildDirectoryLoc, config.buildOptions.webModulesUrl);
    const installResult = await installOptimizedDependencies(scannedFiles, installDest, {
      ...commandOptions,
    });
    if (!installResult.success || installResult.hasError || !installResult.importMap) {
      process.exit(1);
    }
    const allFiles = glob.sync(`**/*`, {
      cwd: installDest,
      absolute: true,
      nodir: true,
      dot: true,
    });
    for (const installedFileLoc of allFiles) {
      if (
        !installedFileLoc.endsWith('import-map.json') &&
        path.extname(installedFileLoc) !== '.js'
      ) {
        const proxiedCode = await fs.readFile(installedFileLoc, {encoding: 'utf-8'});
        const importProxyFileLoc = installedFileLoc + '.proxy.js';
        const proxiedUrl = installedFileLoc.substr(buildDirectoryLoc.length).replace(/\\/g, '/');
        const proxyCode = await wrapImportProxy({
          url: proxiedUrl,
          code: proxiedCode,
          hmr: false,
          config: config,
        });
        await fs.writeFile(importProxyFileLoc, proxyCode, getEncodingType('.js'));
      }
    }
    return installResult;
  }

  // 0. Find all source files.
  for (const [fromDisk, dirDest] of mountedDirectories) {
    const allFiles = glob.sync(`**/*`, {
      ignore: config.exclude,
      cwd: fromDisk,
      absolute: true,
      nodir: true,
      dot: true,
    });
    for (const rawLocOnDisk of allFiles) {
      const locOnDisk = path.resolve(rawLocOnDisk); // this is necessary since glob.sync() returns paths with / on windows.  path.resolve() will switch them to the native path separator.
      const finalDest = locOnDisk.replace(fromDisk, dirDest);
      const outDir = path.dirname(finalDest);
      const buildPipelineFile = new FileBuilder({filepath: locOnDisk, outDir, config});
      buildPipelineFiles[locOnDisk] = buildPipelineFile;
    }
  }

  // 1. Build all files for the first time, from source.
  const parallelWorkQueue = new PQueue({concurrency: CONCURRENT_WORKERS});
  const allBuildPipelineFiles = Object.values(buildPipelineFiles);
  for (const buildPipelineFile of allBuildPipelineFiles) {
    parallelWorkQueue.add(() => buildPipelineFile.buildFile());
  }
  await parallelWorkQueue.onIdle();

  const buildEnd = performance.now();
  logger.info(
    `${colors.green('✔')} build complete ${colors.dim(
      `[${((buildEnd - buildStart) / 1000).toFixed(2)}s]`,
    )}`,
  );

  // 2. Install all dependencies. This gets us the import map we need to resolve imports.
  let installResult = await installDependencies();

  // 3. Resolve all built file imports.
  for (const buildPipelineFile of allBuildPipelineFiles) {
    parallelWorkQueue.add(() => buildPipelineFile.resolveImports(installResult.importMap!));
  }
  await parallelWorkQueue.onIdle();

  // 4. Write files to disk.
  const allImportProxyFiles = new Set(
    allBuildPipelineFiles.map((b) => b.filesToProxy).reduce((flat, item) => flat.concat(item), []),
  );
  for (const buildPipelineFile of allBuildPipelineFiles) {
    parallelWorkQueue.add(() => buildPipelineFile.writeToDisk());
    for (const builtFile of Object.keys(buildPipelineFile.output)) {
      if (allImportProxyFiles.has(builtFile)) {
        parallelWorkQueue.add(() => buildPipelineFile.writeProxyToDisk(builtFile));
      }
    }
  }
  await parallelWorkQueue.onIdle();

  // 5. Optimize the build.
  if (!config.buildOptions.watch) {
    await runPipelineCleanupStep(config);
    await runPipelineOptimizeStep(buildDirectoryLoc, {
      plugins: config.plugins,
      isDev: false,
      isHmrEnabled: false,
      sourceMaps: config.buildOptions.sourceMaps,
    });

    logger.info(`${colors.underline(colors.green(colors.bold('▶ Build Complete!')))}\n\n`);
    return;
  }

  // "--watch" mode - Start watching the file system.
  // Defer "chokidar" loading to here, to reduce impact on overall startup time
  logger.info(colors.cyan('Watching for changes...'));
  const chokidar = await import('chokidar');

  function onDeleteEvent(fileLoc: string) {
    delete buildPipelineFiles[fileLoc];
  }
  async function onWatchEvent(fileLoc: string) {
    logger.info(colors.cyan('File changed...'));
    const [fromDisk, dirDest] =
      mountedDirectories.find(([fromDisk]) => fileLoc.startsWith(fromDisk)) || [];
    if (!fromDisk || !dirDest) {
      return;
    }
    const finalDest = fileLoc.replace(fromDisk, dirDest);
    const outDir = path.dirname(finalDest);
    const changedPipelineFile = new FileBuilder({filepath: fileLoc, outDir, config});
    buildPipelineFiles[fileLoc] = changedPipelineFile;
    // 1. Build the file.
    await changedPipelineFile.buildFile();
    // 2. Resolve any ESM imports. Handle new imports by triggering a re-install.
    let resolveSuccess = await changedPipelineFile.resolveImports(installResult.importMap!);
    if (!resolveSuccess) {
      await installDependencies();
      resolveSuccess = await changedPipelineFile.resolveImports(installResult.importMap!);
      if (!resolveSuccess) {
        logger.error('Exiting...');
        process.exit(1);
      }
    }
    // 3. Write to disk. If any proxy imports are needed, write those as well.
    await changedPipelineFile.writeToDisk();
    const allBuildPipelineFiles = Object.values(buildPipelineFiles);
    const allImportProxyFiles = new Set(
      allBuildPipelineFiles
        .map((b) => b.filesToProxy)
        .reduce((flat, item) => flat.concat(item), []),
    );
    for (const builtFile of Object.keys(changedPipelineFile.output)) {
      if (allImportProxyFiles.has(builtFile)) {
        await changedPipelineFile.writeProxyToDisk(builtFile);
      }
    }
  }
  const watcher = chokidar.watch(
    mountedDirectories.map(([dirDisk]) => dirDisk),
    {
      ignored: config.exclude,
      ignoreInitial: true,
      persistent: true,
      disableGlobbing: false,
    },
  );
  watcher.on('add', (fileLoc) => onWatchEvent(fileLoc));
  watcher.on('change', (fileLoc) => onWatchEvent(fileLoc));
  watcher.on('unlink', (fileLoc) => onDeleteEvent(fileLoc));
}
