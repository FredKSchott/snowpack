import merge from 'deepmerge';
import {ImportMap} from 'esinstall';
import {existsSync, promises as fs} from 'fs';
import * as colors from 'kleur/colors';
import path from 'path';
import {getInstallTargets, run as installRunner} from '../commands/install';
import {logger} from '../logger';
import {CommandOptions, PackageSource, SnowpackConfig} from '../types';
import {checkLockfileHash, DEV_DEPENDENCIES_DIR, updateLockfileHash} from '../util';

/**
 * Install dependencies needed in "dev" mode. Generally speaking, this scans
 * your entire source app for dependency install targets, installs them,
 * and then updates the "hash" file used to check node_modules freshness.
 */
async function installDependencies(commandOptions: CommandOptions) {
  const {config} = commandOptions;
  const installTargets = await getInstallTargets(config);
  if (installTargets.length === 0) {
    logger.info('Nothing to install.');
    return;
  }
  // 2. Install dependencies, based on the scan of your final build.
  const installResult = await installRunner({
    ...commandOptions,
    installTargets,
    config,
    shouldPrintStats: true,
    shouldWriteLockfile: false,
  });
  await updateLockfileHash(DEV_DEPENDENCIES_DIR);
  return installResult;
}

// A bit of a hack: we keep this in local state and populate it
// during the "prepare" call. Useful so that we don't need to pass
// this implementation detail around outside of this interface.
// Can't add it to the exported interface due to TS.
let installCommandOptions: CommandOptions;

/**
 * Skypack Package Source: A generic interface through which Snowpack
 * interacts with esinstall and your locally installed dependencies.
 */
export default {
  installCommandOptions: undefined as undefined | CommandOptions,
  async load(spec: string): Promise<Buffer> {
    const dependencyFileLoc = path.join(DEV_DEPENDENCIES_DIR, spec);
    return fs.readFile(dependencyFileLoc);
  },

  async modifyBuildInstallConfig() {
    // no modifications needed for build
  },

  async prepare(commandOptions: CommandOptions) {
    const {config} = commandOptions;
    // Set the proper install options, in case an install is needed.
    const dependencyImportMapLoc = path.join(DEV_DEPENDENCIES_DIR, 'import-map.json');
    logger.debug(`Using cache folder: ${path.relative(config.root, DEV_DEPENDENCIES_DIR)}`);
    installCommandOptions = merge(commandOptions, {
      config: {
        installOptions: {
          dest: DEV_DEPENDENCIES_DIR,
          env: {NODE_ENV: process.env.NODE_ENV || 'development'},
          treeshake: false,
        },
      },
    });
    // Start with a fresh install of your dependencies, if needed.
    let dependencyImportMap = {imports: {}};
    try {
      dependencyImportMap = JSON.parse(
        await fs.readFile(dependencyImportMapLoc, {encoding: 'utf8'}),
      );
    } catch (err) {
      // no import-map found, safe to ignore
    }
    if (!(await checkLockfileHash(DEV_DEPENDENCIES_DIR)) || !existsSync(dependencyImportMapLoc)) {
      logger.debug('Cache out of date or missing. Updating...');
      const installResult = await installDependencies(installCommandOptions);
      dependencyImportMap = installResult?.importMap || {imports: {}};
    } else {
      logger.debug(`Cache up-to-date. Using existing cache`);
    }
    return dependencyImportMap;
  },

  resolvePackageImport(
    spec: string,
    dependencyImportMap: ImportMap,
    config: SnowpackConfig,
  ): string | false {
    if (dependencyImportMap.imports[spec]) {
      const importMapEntry = dependencyImportMap.imports[spec];
      return path.posix.resolve(config.buildOptions.webModulesUrl, importMapEntry);
    }
    return false;
  },

  async recoverMissingPackageImport(): Promise<ImportMap> {
    logger.info(colors.yellow('Dependency cache out of date. Updating...'));
    const installResult = await installDependencies(installCommandOptions);
    const dependencyImportMap = installResult!.importMap;
    return dependencyImportMap;
  },
} as PackageSource;
