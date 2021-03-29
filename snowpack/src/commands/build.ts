import {ImportMap, InstallTarget} from 'esinstall';
import {promises as fs} from 'fs';
import {fdir} from 'fdir';
import picomatch from 'picomatch';
import * as colors from 'kleur/colors';
import mkdirp from 'mkdirp';
import path from 'path';
import {performance} from 'perf_hooks';
import {wrapImportProxy} from '../build/build-import-proxy';
import {runPipelineCleanupStep, runPipelineOptimizeStep} from '../build/build-pipeline';
import {getUrlsForFile} from '../build/file-urls';
import {runBuiltInOptimize} from '../build/optimize';
import {logger} from '../logger';
import {installPackages} from '../sources/local-install';
import {getPackageSource} from '../sources/util';
import {
  LoadUrlOptions,
  CommandOptions,
  OnFileChangeCallback,
  SnowpackBuildResult,
  SnowpackConfig,
} from '../types';
import {deleteFromBuildSafe, isPathImport, isRemoteUrl} from '../util';
import {startServer} from './dev';

function getIsHmrEnabled(config: SnowpackConfig) {
  return config.buildOptions.watch && !!config.devOptions.hmr;
}

/**
 * Scan a directory and remove any empty folders, recursively.
 */
async function removeEmptyFolders(directoryLoc: string): Promise<boolean> {
  if (!(await fs.stat(directoryLoc)).isDirectory()) {
    return false;
  }
  // If folder is empty, clear it
  const files = await fs.readdir(directoryLoc);
  if (files.length === 0) {
    await fs.rmdir(directoryLoc);
    return false;
  }
  // Otherwise, step in and clean each contained item
  await Promise.all(files.map((file) => removeEmptyFolders(path.join(directoryLoc, file))));
  // After, check again if folder is now empty
  const afterFiles = await fs.readdir(directoryLoc);
  if (afterFiles.length == 0) {
    await fs.rmdir(directoryLoc);
  }
  return true;
}

async function installOptimizedDependencies(
  installTargets: InstallTarget[],
  installDest: string,
  commandOptions: CommandOptions,
) {
  const baseInstallOptions = {
    dest: installDest,
    external: commandOptions.config.packageOptions.external,
    env: {NODE_ENV: process.env.NODE_ENV || 'production'},
    treeshake: commandOptions.config.buildOptions.watch
      ? false
      : commandOptions.config.optimize?.treeshake !== false,
  };

  const pkgSource = getPackageSource(commandOptions.config);
  const installOptions = pkgSource.modifyBuildInstallOptions(baseInstallOptions);
  // 2. Install dependencies, based on the scan of your final build.
  const installResult = await installPackages({
    config: commandOptions.config,
    isSSR: commandOptions.config.buildOptions.ssr,
    isDev: false,
    installTargets,
    installOptions,
  });
  return installResult;
}

export async function build(commandOptions: CommandOptions): Promise<SnowpackBuildResult> {
  const {config} = commandOptions;
  const isWatch = !!config.buildOptions.watch;
  const isDev = !!isWatch;
  const isSSR = !!config.buildOptions.ssr;
  const isHMR = getIsHmrEnabled(config);
  config.buildOptions.resolveProxyImports = !config.optimize?.bundle;
  config.devOptions.hmrPort = isHMR ? config.devOptions.hmrPort : undefined;
  config.devOptions.port = 0;

  const buildDirectoryLoc = config.buildOptions.out;
  if (config.buildOptions.clean) {
    deleteFromBuildSafe(buildDirectoryLoc, config);
  }
  mkdirp.sync(buildDirectoryLoc);

  const devServer = await startServer(commandOptions, {isDev, isWatch, preparePackages: false});

  const allFileUrls: string[] = [];
  for (const [mountKey, mountEntry] of Object.entries(config.mount)) {
    logger.debug(`Mounting directory: '${mountKey}' as URL '${mountEntry.url}'`);
    const files = (await new fdir().withFullPaths().crawl(mountKey).withPromise()) as string[];
    const excludePrivate = new RegExp(`\\${path.sep}\\..+(?!\\${path.sep})`);
    const excludeGlobs = [...config.exclude, ...config.testOptions.files];
    const foundExcludeMatch = picomatch(excludeGlobs);

    for (const f of files) {
      if (excludePrivate.test(f) || foundExcludeMatch(f)) {
        continue;
      }
      const fileUrls = getUrlsForFile(f, config)!;
      // Only push the first URL. In multi-file builds, this is always the JS that the
      // CSS is imported from (if it exists). That CSS may not exist, and we don't know
      // until the JS has been built/loaded.
      allFileUrls.push(fileUrls[0]);
    }
  }

  const pkgUrlPrefix = path.posix.join(config.buildOptions.metaUrlPath, 'pkg/');
  const allBareModuleSpecifiers: InstallTarget[] = [];
  const allFileUrlsUnique = new Set(allFileUrls);
  let allFileUrlsToProcess = [...allFileUrlsUnique];

  async function flushFileQueue(
    ignorePkg: boolean,
    loadOptions: LoadUrlOptions & {encoding?: undefined},
  ) {
    logger.debug(`QUEUE: ${allFileUrlsToProcess}`);
    while (allFileUrlsToProcess.length > 0) {
      const fileUrl = allFileUrlsToProcess.shift()!;
      const fileDestinationLoc = path.join(buildDirectoryLoc, fileUrl);
      logger.debug(`BUILD: ${fileUrl}`);
      // ignore package URLs when `ignorePkg` is true, EXCEPT proxy imports. Those can sometimes
      // be added after the intial package scan, depending on how a non-JS package is imported.
      if (ignorePkg && fileUrl.startsWith(pkgUrlPrefix)) {
        if (fileUrl.endsWith('.proxy.js')) {
          const pkgContents = await fs.readFile(
            path.join(buildDirectoryLoc, fileUrl.replace('.proxy.js', '')),
          );
          const pkgContentsProxy = await wrapImportProxy({
            url: fileUrl.replace('.proxy.js', ''),
            code: pkgContents,
            hmr: isHMR,
            config: config,
          });
          await fs.writeFile(fileDestinationLoc, pkgContentsProxy);
        }
        continue;
      }
      const result = await devServer.loadUrl(fileUrl, loadOptions);
      await mkdirp(path.dirname(fileDestinationLoc));
      await fs.writeFile(fileDestinationLoc, result.contents);
      for (const installTarget of result.imports) {
        const importedUrl = installTarget.specifier;
        logger.debug(`ADD: ${importedUrl}`);
        if (isRemoteUrl(importedUrl)) {
          // do nothing
        } else if (isPathImport(importedUrl)) {
          if (importedUrl[0] === '/') {
            if (!allFileUrlsUnique.has(importedUrl)) {
              allFileUrlsUnique.add(importedUrl);
              allFileUrlsToProcess.push(importedUrl);
            }
          } else {
            logger.warn(`warn: import "${importedUrl}" of "${fileUrl}" could not be resolved.`);
          }
        } else {
          allBareModuleSpecifiers.push(installTarget);
        }
      }
    }
  }

  logger.info(colors.yellow('! building files...'));
  const buildStart = performance.now();
  await flushFileQueue(false, {isSSR, isHMR, isResolve: false});
  const buildEnd = performance.now();
  logger.info(
    `${colors.green('✔')} files built. ${colors.dim(
      `[${((buildEnd - buildStart) / 1000).toFixed(2)}s]`,
    )}`,
  );

  let optimizedImportMap: undefined | ImportMap;
  logger.info(colors.yellow('! building dependencies...'));
  const packagesStart = performance.now();
  if (isWatch) {
    const pkgSource = getPackageSource(commandOptions.config);
    await pkgSource.prepare();
  } else {
    const installDest = path.join(buildDirectoryLoc, config.buildOptions.metaUrlPath, 'pkg');
    const installResult = await installOptimizedDependencies(
      // TODO (v4): We should add `...config.packageOptions.knownEntrypoints` to this array
      // now that knownEntrypoints is no longer needed for dev/test imports.
      [...allBareModuleSpecifiers],
      installDest,
      commandOptions,
    );
    optimizedImportMap = installResult.importMap;
  }
  const packagesEnd = performance.now();
  logger.info(
    `${colors.green('✔')} dependencies built. ${colors.dim(
      `[${((packagesEnd - packagesStart) / 1000).toFixed(2)}s]`,
    )}`,
  );

  logger.info(colors.yellow('! writing to disk...'));
  const writeStart = performance.now();
  allFileUrlsToProcess = [...allFileUrlsUnique];
  await flushFileQueue(!isWatch, {
    isSSR,
    isHMR,
    isResolve: true,
    importMap: optimizedImportMap,
  });
  const writeEnd = performance.now();
  logger.info(
    `${colors.green('✔')} write complete. ${colors.dim(
      `[${((writeEnd - writeStart) / 1000).toFixed(2)}s]`,
    )}`,
  );

  // "--watch" mode - Start watching the file system.
  if (isWatch) {
    let onFileChangeCallback: OnFileChangeCallback = () => {};
    devServer.onFileChange(async ({filePath}) => {
      // First, do our own re-build logic
      const fileUrls = getUrlsForFile(filePath, config);
      if (!fileUrls || fileUrls.length === 0) {
        return;
      }
      allFileUrlsToProcess.push(fileUrls[0]);
      await flushFileQueue(false, {
        isSSR,
        isHMR,
        isResolve: true,
        importMap: optimizedImportMap,
      });
      // Then, call the user's onFileChange callback (if one was provided)
      await onFileChangeCallback({filePath});
    });
    if (devServer.hmrEngine) {
      logger.info(`${colors.green(`HMR ready:`)} ws://localhost:${devServer.hmrEngine.port}`);
    }
    return {
      onFileChange: (callback) => (onFileChangeCallback = callback),
      shutdown() {
        return devServer.shutdown();
      },
    };
  }

  // "--optimize" mode - Optimize the build.
  if (config.optimize || config.plugins.some((p) => p.optimize)) {
    const optimizeStart = performance.now();
    logger.info(colors.yellow('! optimizing build...'));
    await runBuiltInOptimize(config);
    await runPipelineOptimizeStep(buildDirectoryLoc, {config});
    const optimizeEnd = performance.now();
    logger.info(
      `${colors.green('✔')} build optimized. ${colors.dim(
        `[${((optimizeEnd - optimizeStart) / 1000).toFixed(2)}s]`,
      )}`,
    );
  }

  await removeEmptyFolders(buildDirectoryLoc);
  await runPipelineCleanupStep(config);
  logger.info(`${colors.underline(colors.green(colors.bold('▶ Build Complete!')))}`);
  await devServer.shutdown();
  return {
    onFileChange: () => {
      throw new Error('build().onFileChange() only supported in "watch" mode.');
    },
    shutdown: () => {
      throw new Error('build().shutdown() only supported in "watch" mode.');
    },
  };
}

export async function command(commandOptions: CommandOptions) {
  try {
    commandOptions.config.devOptions.output =
      commandOptions.config.devOptions.output ||
      (commandOptions.config.buildOptions.watch ? 'dashboard' : 'stream');
    await build(commandOptions);
  } catch (err) {
    logger.error(err.message);
    logger.error(err.stack);
    process.exit(1);
  }

  if (commandOptions.config.buildOptions.watch) {
    // We intentionally never want to exit in watch mode!
    return new Promise(() => {});
  }
}
