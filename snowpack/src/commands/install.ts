import {DependencyStatsOutput, install, InstallTarget, printStats} from 'esinstall';
import * as colors from 'kleur/colors';
import path from 'path';
import {performance} from 'perf_hooks';
import util from 'util';
import {logger} from '../logger';
import {scanDepList, scanImports, scanImportsFromFiles} from '../scan-imports.js';
import {CommandOptions, ImportMap, SnowpackConfig, SnowpackSourceFile} from '../types/snowpack';
import {writeLockfile} from '../util.js';

export async function getInstallTargets(
  config: SnowpackConfig,
  scannedFiles?: SnowpackSourceFile[],
) {
  const {knownEntrypoints} = config;
  let installTargets: InstallTarget[] = [];
  if (knownEntrypoints) {
    installTargets.push(...scanDepList(knownEntrypoints, config.root));
  }
  // TODO: remove this if block; move logic inside scanImports
  if (scannedFiles) {
    installTargets.push(...(await scanImportsFromFiles(scannedFiles, config)));
  } else {
    installTargets.push(...(await scanImports(process.env.NODE_ENV === 'test', config)));
  }
  return installTargets;
}

export async function command(commandOptions: CommandOptions) {
  const {config} = commandOptions;

  logger.debug('Starting install');
  const installTargets = await getInstallTargets(config);
  logger.debug('Received install targets');
  if (installTargets.length === 0) {
    logger.error('Nothing to install.');
    return;
  }
  logger.debug('Running install command');
  await run({
    ...commandOptions,
    installTargets,
    shouldPrintStats: true,
    shouldWriteLockfile: true,
  }).catch((err) => {
    if (err.loc) {
      logger.error(colors.red(colors.bold(`✘ ${err.loc.file}`)));
    }
    if (err.url) {
      logger.error(colors.dim(`👉 ${err.url}`));
    }
    logger.error(err.message || err);
    process.exit(1);
  });
}

interface InstallRunOptions extends CommandOptions {
  installTargets: InstallTarget[];
  shouldWriteLockfile: boolean;
  shouldPrintStats: boolean;
}

interface InstallRunResult {
  importMap: ImportMap;
  newLockfile: ImportMap | null;
  stats: DependencyStatsOutput | null;
}

export async function run({
  config,
  installTargets,
  shouldWriteLockfile,
  shouldPrintStats,
}: InstallRunOptions): Promise<InstallRunResult> {
  // start
  const installStart = performance.now();
  logger.info(
    colors.yellow(
      '! installing dependencies...' +
        colors.cyan(
          config.experiments.source === 'local' ? '' : ` (source: ${config.experiments.source})`,
        ),
    ),
  );

  if (installTargets.length === 0) {
    return {
      importMap: {imports: {}} as ImportMap,
      newLockfile: null,
      stats: null,
    };
  }

  let newLockfile: ImportMap | null = null;
  const finalResult = await install(installTargets, {
    cwd: config.root,
    lockfile: newLockfile || undefined,
    alias: config.alias,
    logger: {
      debug: (...args: [any, ...any[]]) => logger.debug(util.format(...args)),
      log: (...args: [any, ...any[]]) => logger.info(util.format(...args)),
      warn: (...args: [any, ...any[]]) => logger.warn(util.format(...args)),
      error: (...args: [any, ...any[]]) => logger.error(util.format(...args)),
    },
    ...config.installOptions,
  });

  logger.debug('Install ran successfully!');
  if (shouldWriteLockfile && newLockfile) {
    await writeLockfile(path.join(config.root, 'snowpack.lock.json'), newLockfile);
    logger.debug('Successfully wrote lockfile');
  }

  // finish
  const installEnd = performance.now();
  const depList = (finalResult.importMap && Object.keys(finalResult.importMap.imports)) || [];
  logger.info(
    `${
      depList.length
        ? colors.green(`✔`) + ' install complete!'
        : 'install skipped (nothing to install)'
    } ${colors.dim(`[${((installEnd - installStart) / 1000).toFixed(2)}s]`)}`,
  );

  if (shouldPrintStats && finalResult.stats) {
    logger.info(printStats(finalResult.stats));
  }

  return {
    importMap: finalResult.importMap,
    newLockfile,
    stats: finalResult.stats!,
  };
}
