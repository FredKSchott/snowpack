import {DependencyStatsOutput, install, InstallTarget, printStats} from 'esmpkg';
import * as colors from 'kleur/colors';
import path from 'path';
import {performance} from 'perf_hooks';
import {logger} from '../logger';
import {resolveTargetsFromRemoteCDN} from '../resolve-remote.js';
import {scanDepList, scanImports, scanImportsFromFiles} from '../scan-imports.js';
import {CommandOptions, ImportMap, SnowpackConfig, SnowpackSourceFile} from '../types/snowpack';
import {writeLockfile} from '../util.js';

const cwd = process.cwd();

export async function getInstallTargets(
  config: SnowpackConfig,
  scannedFiles?: SnowpackSourceFile[],
) {
  const {knownEntrypoints, webDependencies} = config;
  const installTargets: InstallTarget[] = [];
  if (knownEntrypoints) {
    installTargets.push(...scanDepList(knownEntrypoints, cwd));
  }
  if (webDependencies) {
    installTargets.push(...scanDepList(Object.keys(webDependencies), cwd));
  }
  // TODO: remove this if block; move logic inside scanImports
  if (scannedFiles) {
    installTargets.push(...(await scanImportsFromFiles(scannedFiles, config)));
  } else {
    installTargets.push(...(await scanImports(cwd, config)));
  }
  return installTargets;
}

export async function command(commandOptions: CommandOptions) {
  const {cwd, config} = commandOptions;

  logger.debug('Starting install');
  const installTargets = await getInstallTargets(config);
  logger.debug('Received install targets');
  if (installTargets.length === 0) {
    logger.error('Nothing to install.');
    return;
  }
  logger.debug('Running install command');
  const finalResult = await run({...commandOptions, installTargets});
  logger.debug('Install command successfully ran');
  if (finalResult.newLockfile) {
    await writeLockfile(path.join(cwd, 'snowpack.lock.json'), finalResult.newLockfile);
    logger.debug('Successfully wrote lockfile');
  }
  if (finalResult.stats) {
    logger.info(printStats(finalResult.stats));
  }

  if (!finalResult.success || finalResult.hasError) {
    process.exit(1);
  }
}

interface InstallRunOptions extends CommandOptions {
  installTargets: InstallTarget[];
}

interface InstallRunResult {
  success: boolean;
  hasError: boolean;
  importMap: ImportMap | null;
  newLockfile: ImportMap | null;
  stats: DependencyStatsOutput | null;
}

export async function run({
  config,
  lockfile,
  installTargets,
}: InstallRunOptions): Promise<InstallRunResult> {
  const {webDependencies} = config;

  // start
  const installStart = performance.now();
  logger.info(colors.yellow('! installing dependencies…'));

  if (installTargets.length === 0) {
    return {
      success: true,
      hasError: false,
      importMap: {imports: {}} as ImportMap,
      newLockfile: null,
      stats: null,
    };
  }

  let newLockfile: ImportMap | null = null;
  if (webDependencies && Object.keys(webDependencies).length > 0) {
    newLockfile = await resolveTargetsFromRemoteCDN(lockfile, config).catch((err) => {
      logger.error('\n' + err.message || err);
      process.exit(1);
    });
  }

  const finalResult = await install(installTargets, {
    lockfile: newLockfile || undefined,
    alias: config.alias,
    logLevel: logger.level,
    ...config.installOptions,
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

  // finish
  const installEnd = performance.now();
  const depList = (finalResult.importMap && Object.keys(finalResult.importMap.imports)) || [];
  logger.info(
    `${
      depList.length
        ? colors.green(`✔`) + ' install complete'
        : 'install skipped (nothing to install)'
    } ${colors.dim(`[${((installEnd - installStart) / 1000).toFixed(2)}s]`)}`,
  );

  return {
    success: true,
    hasError: false,
    importMap: finalResult.importMap,
    newLockfile,
    stats: finalResult.stats!,
  };
}
