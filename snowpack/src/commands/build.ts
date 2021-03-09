import {ImportMap, InstallTarget} from 'esinstall';
import {promises as fs} from 'fs';
import glob from 'glob';
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
import {deleteFromBuildSafe, isRemoteUrl} from '../util';
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

  const pkgSource = getPackageSource(commandOptions.config.packageOptions.source);
  const installOptions = pkgSource.modifyBuildInstallOptions({
    installOptions: baseInstallOptions,
    config: commandOptions.config,
    lockfile: commandOptions.lockfile,
  });
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
  const isDev = !!config.buildOptions.watch;
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

  const devServer = await startServer(commandOptions, {isDev});

  const allFileUrls: string[] = [];
  for (const [mountKey, mountEntry] of Object.entries(config.mount)) {
    logger.debug(`Mounting directory: '${mountKey}' as URL '${mountEntry.url}'`);
    const files = glob.sync(path.join(mountKey, '**'), {
      nodir: true,
      absolute: true,
      ignore: [...config.exclude, ...config.testOptions.files],
    });
    for (const f of files) {
      const normalizedFileLoc = path.normalize(f);
      const fileUrls = getUrlsForFile(normalizedFileLoc, config)!;
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
        } else if (importedUrl.startsWith('./') || importedUrl.startsWith('../')) {
          logger.warn(`warn: import "${importedUrl}" of "${fileUrl}" could not be resolved.`);
        } else if (!importedUrl.startsWith('/')) {
          allBareModuleSpecifiers.push(installTarget);
        } else if (!allFileUrlsUnique.has(importedUrl)) {
          allFileUrlsUnique.add(importedUrl);
          allFileUrlsToProcess.push(importedUrl);
        }
      }
    }
  }

  logger.info(colors.yellow('! building files...'));
  const buildStart = performance.now();
  await flushFileQueue(false, {isSSR, isHMR, isResolve: false});
  const buildEnd = performance.now();
  logger.info(
    `${colors.green('✔')} build complete. ${colors.dim(
      `[${((buildEnd - buildStart) / 1000).toFixed(2)}s]`,
    )}`,
  );

  let optimizedImportMap: undefined | ImportMap;
  if (!config.buildOptions.watch) {
    logger.info(colors.yellow('! optimizing dependencies...'));
    const packagesStart = performance.now();
    const installDest = path.join(buildDirectoryLoc, config.buildOptions.metaUrlPath, 'pkg');
    const installResult = await installOptimizedDependencies(
      [...allBareModuleSpecifiers],
      installDest,
      commandOptions,
    );
    const packagesEnd = performance.now();
    logger.info(
      `${colors.green('✔')} dependencies ready. ${colors.dim(
        `[${((packagesEnd - packagesStart) / 1000).toFixed(2)}s]`,
      )}`,
    );
    optimizedImportMap = installResult.importMap;
  }

  logger.info(colors.yellow('! writing files...'));
  const writeStart = performance.now();
  allFileUrlsToProcess = [...allFileUrlsUnique];
  await flushFileQueue(!config.buildOptions.watch, {
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
  if (config.buildOptions.watch) {
    let onFileChangeCallback: OnFileChangeCallback = () => {};
    devServer.onFileChange(async ({filePath}) => {
      // First, do our own re-build logic
      allFileUrlsToProcess.push(...getUrlsForFile(filePath, config)!);
      await flushFileQueue(true, {
        isSSR,
        isHMR,
        isResolve: true,
        importMap: optimizedImportMap,
      });
      // Then, call the user's onFileChange callback (if one was provided)
      await onFileChangeCallback({filePath});
    });
    logger.info(colors.cyan('watching for file changes...'));
    logger.info(
      `${colors.cyan(
        `[HMR] WebSocket URL available at ws://localhost:${devServer.hmrEngine.port}`,
      )}`,
    );
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
      `${colors.green('✔')} optimize complete ${colors.dim(
        `[${((optimizeEnd - optimizeStart) / 1000).toFixed(2)}s]`,
      )}`,
    );
  }

  await removeEmptyFolders(buildDirectoryLoc);
  await runPipelineCleanupStep(config);
  logger.info(`${colors.underline(colors.green(colors.bold('▶ Build Complete!')))}\n\n`);
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
