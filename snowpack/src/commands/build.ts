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
import {getMountEntryForFile, getUrlForFileMount} from '../build/file-urls';
import {createImportResolver} from '../build/import-resolver';
import {runBuiltInOptimize} from '../build/optimize';
import {EsmHmrEngine} from '../hmr-server-engine';
import {logger} from '../logger';
import {transformFileImports} from '../rewrite-imports';
import localPackageSource from '../sources/local';
import {
  CommandOptions,
  ImportMap,
  MountEntry,
  OnFileChangeCallback,
  SnowpackBuildResult,
  SnowpackBuildResultFileManifest,
  SnowpackConfig,
  SnowpackSourceFile,
} from '../types/snowpack';
import {
  cssSourceMappingURL,
  getExtensionMatch,
  getPackageSource,
  HMR_CLIENT_CODE,
  HMR_OVERLAY_CODE,
  isFsEventsEnabled,
  isRemoteUrl,
  jsSourceMappingURL,
  readFile,
  relativeURL,
  removeLeadingSlash,
  replaceExtension,
} from '../util';
import {getInstallTargets, run as installRunner} from './install';

const CONCURRENT_WORKERS = require('os').cpus().length;

let hmrEngine: EsmHmrEngine | null = null;
function getIsHmrEnabled(config: SnowpackConfig) {
  return config.buildOptions.watch && !!config.devOptions.hmr;
}

function handleFileError(err: Error, builder: FileBuilder) {
  logger.error(`✘ ${builder.fileURL}`);
  throw err;
}

function createBuildFileManifest(allFiles: FileBuilder[]): SnowpackBuildResultFileManifest {
  const result: SnowpackBuildResultFileManifest = {};
  for (const sourceFile of allFiles) {
    for (const outputFile of Object.entries(sourceFile.output)) {
      result[outputFile[0]] = {
        source: url.fileURLToPath(sourceFile.fileURL),
        contents: outputFile[1],
      };
    }
  }
  return result;
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

  const pkgSource = getPackageSource(commandOptions.config.experiments.source);
  pkgSource.modifyBuildInstallConfig({config: installConfig, lockfile: commandOptions.lockfile});

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
    shouldPrintStats: false,
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

  readonly fileURL: URL;
  readonly mountEntry: MountEntry;
  readonly outDir: string;
  readonly config: SnowpackConfig;
  readonly lockfile: ImportMap | null;

  constructor({
    fileURL,
    mountEntry,
    outDir,
    config,
    lockfile,
  }: {
    fileURL: URL;
    mountEntry: MountEntry;
    outDir: string;
    config: SnowpackConfig;
    lockfile: ImportMap | null;
  }) {
    this.fileURL = fileURL;
    this.mountEntry = mountEntry;
    this.outDir = outDir;
    this.config = config;
    this.lockfile = lockfile;
  }

  async buildFile() {
    this.filesToResolve = {};
    const isSSR = this.config.experiments.ssr;
    const srcExt = path.extname(url.fileURLToPath(this.fileURL));
    const fileOutput = this.mountEntry.static
      ? {[srcExt]: {code: await readFile(this.fileURL)}}
      : await buildFile(this.fileURL, {
          config: this.config,
          isDev: false,
          isSSR,
          isHmrEnabled: false,
        });

    for (const [fileExt, buildResult] of Object.entries(fileOutput)) {
      let {code, map} = buildResult;
      if (!code) {
        continue;
      }
      let outFilename = path.basename(url.fileURLToPath(this.fileURL));
      const extensionMatch = getExtensionMatch(this.fileURL.toString(), this.config._extensionMap);
      if (extensionMatch) {
        outFilename = replaceExtension(
          path.basename(url.fileURLToPath(this.fileURL)),
          extensionMatch[0],
          fileExt,
        );
      }
      const outLoc = path.join(this.outDir, outFilename);
      const sourceMappingURL = outFilename + '.map';
      if (this.mountEntry.resolve && typeof code === 'string') {
        switch (fileExt) {
          case '.css': {
            if (map) code = cssSourceMappingURL(code, sourceMappingURL);
            this.filesToResolve[outLoc] = {
              baseExt: fileExt,
              root: this.config.root,
              contents: code,
              locOnDisk: url.fileURLToPath(this.fileURL),
            };
            break;
          }

          case '.js': {
            if (fileOutput['.css']) {
              // inject CSS if imported directly
              const cssFilename = outFilename.replace(/\.js$/i, '.css');
              code = `import './${cssFilename}';\n` + code;
            }
            code = wrapImportMeta({code, env: true, hmr: false, config: this.config});
            if (map) code = jsSourceMappingURL(code, sourceMappingURL);
            this.filesToResolve[outLoc] = {
              baseExt: fileExt,
              root: this.config.root,
              contents: code,
              locOnDisk: url.fileURLToPath(this.fileURL),
            };
            break;
          }

          case '.html': {
            code = wrapHtmlResponse({
              code,
              hmr: getIsHmrEnabled(this.config),
              hmrPort: hmrEngine ? hmrEngine.port : undefined,
              isDev: false,
              config: this.config,
              mode: 'production',
            });
            this.filesToResolve[outLoc] = {
              baseExt: fileExt,
              root: this.config.root,
              contents: code,
              locOnDisk: url.fileURLToPath(this.fileURL),
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
        config: this.config,
      });
      const resolvedCode = await transformFileImports(file, (spec) => {
        // Try to resolve the specifier to a known URL in the project
        let resolvedImportUrl = resolveImportSpecifier(spec);
        // If not resolved, then this is a package. During build, dependencies are always
        // installed locally via esinstall, so use localPackageSource here.
        if (importMap.imports[spec]) {
          resolvedImportUrl = localPackageSource.resolvePackageImport(spec, importMap, this.config);
        }
        // If still not resolved, then this imported package somehow evaded detection
        // when we scanned it in the previous step. If you find a bug here, report it!
        if (!resolvedImportUrl) {
          isSuccess = false;
          logger.error(`${file.locOnDisk} - Could not resolve unknown import "${spec}".`);
          return spec;
        }
        // Ignore "http://*" imports
        if (isRemoteUrl(resolvedImportUrl)) {
          return resolvedImportUrl;
        }
        // Ignore packages marked as external
        if (this.config.installOptions.externalPackage?.includes(resolvedImportUrl)) {
          return spec;
        }
        // Handle normal "./" & "../" import specifiers
        const importExtName = path.extname(resolvedImportUrl);
        const isBundling = !!this.config.experiments.optimize?.bundle;
        const isProxyImport =
          importExtName &&
          (file.baseExt === '.js' || file.baseExt === '.html') &&
          importExtName !== '.js' &&
          // If using our built-in bundler, treat CSS as a first class citizen (no proxy file needed).
          // TODO: Remove special `.module.css` handling by building css modules to native JS + CSS.
          (!isBundling || !/(?<!module)\.css$/.test(resolvedImportUrl));
        const isAbsoluteUrlPath = path.posix.isAbsolute(resolvedImportUrl);
        let resolvedImportPath = removeLeadingSlash(path.normalize(resolvedImportUrl));
        // We treat ".proxy.js" files special: we need to make sure that they exist on disk
        // in the final build, so we mark them to be written to disk at the next step.
        if (isProxyImport) {
          if (isAbsoluteUrlPath) {
            this.filesToProxy.push(path.resolve(this.config.buildOptions.out, resolvedImportPath));
          } else {
            this.filesToProxy.push(path.resolve(path.dirname(outLoc), resolvedImportPath));
          }

          resolvedImportPath = resolvedImportPath + '.proxy.js';
          resolvedImportUrl = resolvedImportUrl + '.proxy.js';
        }

        // When dealing with an absolute import path, we need to honor the baseUrl
        if (isAbsoluteUrlPath) {
          resolvedImportUrl = relativeURL(
            path.dirname(outLoc),
            path.resolve(this.config.buildOptions.out, resolvedImportPath),
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

  async getProxy(originalFileLoc: string) {
    const proxiedCode = this.output[originalFileLoc];
    const proxiedUrl = originalFileLoc
      .substr(this.config.buildOptions.out.length)
      .replace(/\\/g, '/');
    return wrapImportProxy({
      url: proxiedUrl,
      code: proxiedCode,
      hmr: false,
      config: this.config,
    });
  }

  async writeProxyToDisk(originalFileLoc: string) {
    const proxyCode = await this.getProxy(originalFileLoc);
    const importProxyFileLoc = originalFileLoc + '.proxy.js';
    await fs.writeFile(importProxyFileLoc, proxyCode, 'utf-8');
  }
}

export async function buildProject(commandOptions: CommandOptions): Promise<SnowpackBuildResult> {
  const {config, lockfile} = commandOptions;
  const isDev = !!config.buildOptions.watch;
  const isSSR = !!config.experiments.ssr;

  // Fill in any command-specific plugin methods.
  // NOTE: markChanged only needed during dev, but may not be true for all.
  if (isDev) {
    for (const p of config.plugins) {
      p.markChanged = (fileLoc) => onWatchEvent(fileLoc) || undefined;
    }
  }

  const buildDirectoryLoc = config.buildOptions.out;
  const internalFilesBuildLoc = path.join(buildDirectoryLoc, config.buildOptions.metaDir);

  if (config.buildOptions.clean) {
    rimraf.sync(buildDirectoryLoc);
  }
  mkdirp.sync(buildDirectoryLoc);
  mkdirp.sync(internalFilesBuildLoc);

  for (const runPlugin of config.plugins) {
    if (runPlugin.run) {
      logger.debug(`starting ${runPlugin.name} run() (isDev=${isDev})`);
      const runJob = runPlugin
        .run({
          isDev: isDev,
          // @ts-ignore: deprecated
          isHmrEnabled: getIsHmrEnabled(config),
          // @ts-ignore: internal API only
          log: (msg, data: {msg: string} = {}) => {
            if (msg === 'CONSOLE_INFO' || msg === 'WORKER_MSG') {
              logger.info(data.msg.trim(), {name: runPlugin.name});
            }
          },
        })
        .catch((err) => {
          logger.error(err.toString(), {name: runPlugin.name});
          if (!isDev) {
            process.exit(1);
          }
        });
      // Wait for the job to complete before continuing (unless in watch mode)
      if (!isDev) {
        await runJob;
      }
    }
  }

  // Write the `import.meta.env` contents file to disk
  logger.debug(`generating meta files`);
  await fs.writeFile(
    path.join(internalFilesBuildLoc, 'env.js'),
    generateEnvModule({mode: 'production', isSSR}),
  );
  if (getIsHmrEnabled(config)) {
    await fs.writeFile(path.resolve(internalFilesBuildLoc, 'hmr-client.js'), HMR_CLIENT_CODE);
    await fs.writeFile(
      path.resolve(internalFilesBuildLoc, 'hmr-error-overlay.js'),
      HMR_OVERLAY_CODE,
    );
    hmrEngine = new EsmHmrEngine({port: config.devOptions.hmrPort});
  }

  logger.info(colors.yellow('! building source files...'));
  const buildStart = performance.now();
  const buildPipelineFiles: Record<string, FileBuilder> = {};

  /** Install all needed dependencies, based on the master buildPipelineFiles list.  */
  async function installDependencies() {
    const scannedFiles = Object.values(buildPipelineFiles)
      .map((f) => Object.values(f.filesToResolve))
      .reduce((flat, item) => flat.concat(item), []);
    const installDest = path.join(buildDirectoryLoc, config.buildOptions.webModulesUrl);
    const installResult = await installOptimizedDependencies(
      scannedFiles,
      installDest,
      commandOptions,
    );
    const allFiles = glob.sync(`**/*`, {
      cwd: installDest,
      absolute: true,
      nodir: true,
      dot: true,
      follow: true,
    });

    if (!config.experiments.optimize?.bundle) {
      for (const installedFileLoc of allFiles) {
        if (
          !installedFileLoc.endsWith('import-map.json') &&
          path.extname(installedFileLoc) !== '.js'
        ) {
          const proxiedCode = await readFile(url.pathToFileURL(installedFileLoc));
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
    }
    return installResult;
  }

  // 0. Find all source files.
  for (const [mountedDir, mountEntry] of Object.entries(config.mount)) {
    const finalDestLocMap = new Map<string, string>();
    const allFiles = glob.sync(`**/*`, {
      ignore: [...config.exclude, ...config.testOptions.files],
      cwd: mountedDir,
      absolute: true,
      nodir: true,
      dot: true,
      follow: true,
    });
    for (const rawLocOnDisk of allFiles) {
      const fileLoc = path.resolve(rawLocOnDisk); // this is necessary since glob.sync() returns paths with / on windows.  path.resolve() will switch them to the native path separator.
      const finalUrl = getUrlForFileMount({fileLoc, mountKey: mountedDir, mountEntry, config})!;
      const finalDestLoc = path.join(buildDirectoryLoc, finalUrl);

      const existedFileLoc = finalDestLocMap.get(finalDestLoc);
      if (existedFileLoc) {
        logger.error(`Error: Two files overlap and build to the same destination: ${finalDestLoc}`);
        logger.error(`  File 1: ${existedFileLoc}`);
        logger.error(`  File 2: ${fileLoc}`);
        process.exit(1);
      }

      const outDir = path.dirname(finalDestLoc);
      const buildPipelineFile = new FileBuilder({
        fileURL: url.pathToFileURL(fileLoc),
        mountEntry,
        outDir,
        config,
        lockfile,
      });
      buildPipelineFiles[fileLoc] = buildPipelineFile;

      finalDestLocMap.set(finalDestLoc, fileLoc);
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
  const verifyStart = performance.now();
  for (const buildPipelineFile of allBuildPipelineFiles) {
    parallelWorkQueue.add(() =>
      buildPipelineFile
        .resolveImports(installResult.importMap!)
        .catch((err) => handleFileError(err, buildPipelineFile)),
    );
  }
  await parallelWorkQueue.onIdle();
  const verifyEnd = performance.now();
  logger.info(
    `${colors.green('✔')} verification complete ${colors.dim(
      `[${((verifyEnd - verifyStart) / 1000).toFixed(2)}s]`,
    )}`,
  );

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

  const buildResultManifest = createBuildFileManifest(allBuildPipelineFiles);
  // TODO(fks): Add support for virtual files (injected by snowpack, plugins)
  // and web_modules in this manifest.
  // buildResultManifest[path.join(internalFilesBuildLoc, 'env.js')] = {
  //   source: null,
  //   contents: generateEnvModule({mode: 'production', isSSR}),
  // };

  // 5. Optimize the build.
  if (!config.buildOptions.watch) {
    if (config.experiments.optimize || config.plugins.some((p) => p.optimize)) {
      const optimizeStart = performance.now();
      logger.info(colors.yellow('! optimizing build...'));
      await runBuiltInOptimize(config);
      await runPipelineOptimizeStep(buildDirectoryLoc, {
        config,
        isDev: false,
        isSSR: config.experiments.ssr,
        isHmrEnabled: false,
      });
      const optimizeEnd = performance.now();
      logger.info(
        `${colors.green('✔')} optimize complete ${colors.dim(
          `[${((optimizeEnd - optimizeStart) / 1000).toFixed(2)}s]`,
        )}`,
      );
    }
    await runPipelineCleanupStep(config);
    logger.info(`${colors.underline(colors.green(colors.bold('▶ Build Complete!')))}\n\n`);
    return {
      result: buildResultManifest,
      onFileChange: () => {
        throw new Error('buildProject().onFileChange() only supported in "watch" mode.');
      },
      shutdown: () => {
        throw new Error('buildProject().shutdown() only supported in "watch" mode.');
      },
    };
  }

  // "--watch --hmr" mode - Tell users about the HMR WebSocket URL
  if (hmrEngine) {
    logger.info(
      `[HMR] WebSocket URL available at ${colors.cyan(`ws://localhost:${hmrEngine.port}`)}`,
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
    const mountEntryResult = getMountEntryForFile(fileLoc, config);
    if (!mountEntryResult) {
      return;
    }
    onFileChangeCallback({filePath: fileLoc});
    const [mountKey, mountEntry] = mountEntryResult;
    const finalUrl = getUrlForFileMount({fileLoc, mountKey, mountEntry, config})!;
    const finalDest = path.join(buildDirectoryLoc, finalUrl);
    const outDir = path.dirname(finalDest);
    const changedPipelineFile = new FileBuilder({
      fileURL: url.pathToFileURL(fileLoc),
      mountEntry,
      outDir,
      config,
      lockfile,
    });
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
    useFsEvents: isFsEventsEnabled(),
  });
  watcher.on('add', (fileLoc) => onWatchEvent(fileLoc));
  watcher.on('change', (fileLoc) => onWatchEvent(fileLoc));
  watcher.on('unlink', (fileLoc) => onDeleteEvent(fileLoc));

  // Allow the user to hook into this callback, if they like (noop by default)
  let onFileChangeCallback: OnFileChangeCallback = () => {};

  return {
    result: buildResultManifest,
    onFileChange: (callback) => (onFileChangeCallback = callback),
    async shutdown() {
      await watcher.close();
    },
  };
}

export async function command(commandOptions: CommandOptions) {
  try {
    await buildProject(commandOptions);
  } catch (err) {
    logger.error(err.message);
    logger.debug(err.stack);
    process.exit(1);
  }

  if (commandOptions.config.buildOptions.watch) {
    // We intentionally never want to exit in watch mode!
    return new Promise(() => {});
  }
}
