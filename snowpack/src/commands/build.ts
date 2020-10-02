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
import {getUrlForFileMount, getUrlForFile} from '../build/file-urls';
import {EsmHmrEngine} from '../hmr-server-engine';
import {logger} from '../logger';
import {transformFileImports} from '../rewrite-imports';
import {CommandOptions, ImportMap, SnowpackConfig, SnowpackSourceFile} from '../types/snowpack';
import {
  cssSourceMappingURL,
  HMR_CLIENT_CODE,
  HMR_OVERLAY_CODE,
  jsSourceMappingURL,
  readFile,
  relativeURL,
  removeLeadingSlash,
  replaceExt,
} from '../util';
import {getInstallTargets, run as installRunner} from './install';

const CONCURRENT_WORKERS = require('os').cpus().length;

let hmrEngine: EsmHmrEngine | null = null;
function getIsHmrEnabled(config: SnowpackConfig) {
  return config.buildOptions.watch && !!config.devOptions.hmr;
}

function handleFileError(err: Error, builder: FileBuilder) {
  logger.error(`✘ ${builder.filepath}\n  ${err.stack ? err.stack : err.message}`);
  process.exit(1);
}

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
    shouldPrintStats: true,
    shouldWriteLockfile: false,
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
      isSSR: this.config.experiments.ssr,
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
              hmr: getIsHmrEnabled(this.config),
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
    for (const [outLoc, rawFile] of Object.entries(this.filesToResolve)) {
      // don’t transform binary file contents
      if (Buffer.isBuffer(rawFile.contents)) {
        continue;
      }
      const file = rawFile as SnowpackSourceFile<string>;
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
          logger.error(`${file.locOnDisk} - Could not resolve unknown import "${spec}".`);
          return spec;
        }
        // Ignore "http://*" imports
        if (url.parse(resolvedImportUrl).protocol) {
          return spec;
        }
        // Ignore packages marked as external
        if (this.config.installOptions.externalPackage?.includes(resolvedImportUrl)) {
          return spec;
        }
        // Handle normal "./" & "../" import specifiers
        const importExtName = path.extname(resolvedImportUrl);
        const isProxyImport =
          importExtName &&
          (file.baseExt === '.js' || file.baseExt === '.html') &&
          importExtName !== '.js';
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
      const encoding = typeof code === 'string' ? 'utf-8' : undefined;
      await fs.writeFile(outLoc, code, encoding);
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
    await fs.writeFile(importProxyFileLoc, proxyCode, 'utf-8');
  }
}

export async function command(commandOptions: CommandOptions) {
  const {config} = commandOptions;
  const isWatch = !!config.buildOptions.watch;

  const buildDirectoryLoc = config.devOptions.out;
  const internalFilesBuildLoc = path.join(buildDirectoryLoc, config.buildOptions.metaDir);

  if (config.buildOptions.clean) {
    rimraf.sync(buildDirectoryLoc);
  }
  mkdirp.sync(buildDirectoryLoc);
  mkdirp.sync(internalFilesBuildLoc);

  for (const runPlugin of config.plugins) {
    if (runPlugin.run) {
      const runJob = runPlugin
        .run({
          isDev: isWatch,
          isHmrEnabled: getIsHmrEnabled(config),
          // @ts-ignore: internal API only
          log: (msg, data: {msg: string} = {}) => {
            if (msg === 'WORKER_MSG') {
              logger.info(`[${runPlugin.name}] ${data.msg.trim()}`);
            }
          },
        })
        .catch((err) => {
          logger.error(err.toString(), {name: runPlugin.name});
          if (!isWatch) {
            process.exit(1);
          }
        });
      // Wait for the job to complete before continuing (unless in watch mode)
      if (!isWatch) {
        await runJob;
      }
    }
  }

  // Write the `import.meta.env` contents file to disk
  await fs.writeFile(path.join(internalFilesBuildLoc, 'env.js'), generateEnvModule('production'));
  if (getIsHmrEnabled(config)) {
    await fs.writeFile(path.resolve(internalFilesBuildLoc, 'hmr-client.js'), HMR_CLIENT_CODE);
    await fs.writeFile(
      path.resolve(internalFilesBuildLoc, 'hmr-error-overlay.js'),
      HMR_OVERLAY_CODE,
    );
    hmrEngine = new EsmHmrEngine({port: config.devOptions.hmrPort});
  }

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
        const proxiedCode = await readFile(installedFileLoc);
        const importProxyFileLoc = installedFileLoc + '.proxy.js';
        const proxiedUrl = installedFileLoc.substr(buildDirectoryLoc.length).replace(/\\/g, '/');
        const proxyCode = await wrapImportProxy({
          url: proxiedUrl,
          code: proxiedCode,
          hmr: false,
          config: config,
        });
        await fs.writeFile(importProxyFileLoc, proxyCode, 'utf-8');
      }
    }
    return installResult;
  }

  // 0. Find all source files.
  for (const [mountedDir, mountEntry] of Object.entries(config.mount)) {
    const allFiles = glob.sync(`**/*`, {
      ignore: config.exclude,
      cwd: mountedDir,
      absolute: true,
      nodir: true,
      dot: true,
    });
    for (const rawLocOnDisk of allFiles) {
      const fileLoc = path.resolve(rawLocOnDisk); // this is necessary since glob.sync() returns paths with / on windows.  path.resolve() will switch them to the native path separator.
      const finalUrl = getUrlForFileMount({fileLoc, mountKey: mountedDir, mountEntry, config})!;
      const finalDestLoc = path.join(buildDirectoryLoc, finalUrl);
      const outDir = path.dirname(finalDestLoc);
      const buildPipelineFile = new FileBuilder({filepath: fileLoc, outDir, config});
      buildPipelineFiles[fileLoc] = buildPipelineFile;
    }
  }

  // 1. Build all files for the first time, from source.
  const parallelWorkQueue = new PQueue({concurrency: CONCURRENT_WORKERS});
  const allBuildPipelineFiles = Object.values(buildPipelineFiles);
  for (const buildPipelineFile of allBuildPipelineFiles) {
    parallelWorkQueue.add(() =>
      buildPipelineFile.buildFile().catch((err) => handleFileError(err, buildPipelineFile)),
    );
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

  logger.info(colors.yellow('! verifying build...'));

  // 3. Resolve all built file imports.
  for (const buildPipelineFile of allBuildPipelineFiles) {
    parallelWorkQueue.add(() =>
      buildPipelineFile
        .resolveImports(installResult.importMap!)
        .catch((err) => handleFileError(err, buildPipelineFile)),
    );
  }
  await parallelWorkQueue.onIdle();
  logger.info(`${colors.green('✔')} verification complete`);

  // 4. Write files to disk.
  logger.info(colors.yellow('! writing build to disk...'));
  const allImportProxyFiles = new Set(
    allBuildPipelineFiles.map((b) => b.filesToProxy).reduce((flat, item) => flat.concat(item), []),
  );
  for (const buildPipelineFile of allBuildPipelineFiles) {
    parallelWorkQueue.add(() => buildPipelineFile.writeToDisk());
    for (const builtFile of Object.keys(buildPipelineFile.output)) {
      if (allImportProxyFiles.has(builtFile)) {
        parallelWorkQueue.add(() =>
          buildPipelineFile
            .writeProxyToDisk(builtFile)
            .catch((err) => handleFileError(err, buildPipelineFile)),
        );
      }
    }
  }
  await parallelWorkQueue.onIdle();

  logger.info(
    `${colors.green('✔')} build complete ${colors.dim(
      `[${((buildEnd - buildStart) / 1000).toFixed(2)}s]`,
    )}`,
  );

  // 5. Optimize the build.
  if (!config.buildOptions.watch) {
    await runPipelineCleanupStep(config);
    await runPipelineOptimizeStep(buildDirectoryLoc, {
      plugins: config.plugins,
      isDev: false,
      isSSR: config.experiments.ssr,
      isHmrEnabled: false,
      sourceMaps: config.buildOptions.sourceMaps,
    });
    logger.info(`${colors.underline(colors.green(colors.bold('▶ Build Complete!')))}\n\n`);
    return;
  }

  // "--watch --hmr" mode - Tell users about the HMR WebSocket URL
  if (hmrEngine) {
    logger.info(
      `[HMR] WebSocket URL available at ${colors.cyan(
        `ws://localhost:${config.devOptions.hmrPort}`,
      )}`,
    );
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
    const toUrl = getUrlForFile(fileLoc, config);
    if (!toUrl) {
      return;
    }
    const finalDest = path.join(buildDirectoryLoc, toUrl);
    const outDir = path.dirname(finalDest);

    const changedPipelineFile = new FileBuilder({filepath: fileLoc, outDir, config});
    buildPipelineFiles[fileLoc] = changedPipelineFile;
    // 1. Build the file.
    await changedPipelineFile.buildFile().catch((err) => {
      logger.error(fileLoc + ' ' + err.toString(), {name: err.__snowpackBuildDetails?.name});
      hmrEngine &&
        hmrEngine.broadcastMessage({
          type: 'error',
          title:
            `Build Error` + err.__snowpackBuildDetails
              ? `: ${err.__snowpackBuildDetails.name}`
              : '',
          errorMessage: err.toString(),
          fileLoc,
          errorStackTrace: err.stack,
        });
    });
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

    if (hmrEngine) {
      hmrEngine.broadcastMessage({type: 'reload'});
    }
  }
  const watcher = chokidar.watch(Object.keys(config.mount), {
    ignored: config.exclude,
    ignoreInitial: true,
    persistent: true,
    disableGlobbing: false,
  });
  watcher.on('add', (fileLoc) => onWatchEvent(fileLoc));
  watcher.on('change', (fileLoc) => onWatchEvent(fileLoc));
  watcher.on('unlink', (fileLoc) => onDeleteEvent(fileLoc));

  // We intentionally never want to exit in watch mode!
  return new Promise(() => {});
}
