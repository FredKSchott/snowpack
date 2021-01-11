import rimraf from 'rimraf';
import crypto from 'crypto';
import projectCacheDir from 'find-cache-dir';
import merge from 'deepmerge';
import {ImportMap, InstallOptions as EsinstallOptions} from 'esinstall';
import {existsSync, promises as fs} from 'fs';
import * as colors from 'kleur/colors';
import path from 'path';
import {run as installRunner} from './local-install';
import {logger} from '../logger';
import {getInstallTargets} from '../scan-imports';
import {CommandOptions, PackageSource, PackageSourceLocal, SnowpackConfig} from '../types';
import {checkLockfileHash, GLOBAL_CACHE_DIR, updateLockfileHash} from '../util';

const PROJECT_CACHE_DIR =
  projectCacheDir({name: 'snowpack'}) ||
  // If `projectCacheDir()` is null, no node_modules directory exists.
  // Use the current path (hashed) to create a cache entry in the global cache instead.
  // Because this is specifically for dependencies, this fallback should rarely be used.
  path.join(GLOBAL_CACHE_DIR, crypto.createHash('md5').update(process.cwd()).digest('hex'));

const DEV_DEPENDENCIES_DIR = path.join(PROJECT_CACHE_DIR, process.env.NODE_ENV || 'development');

/**
 * Install dependencies needed in "dev" mode. Generally speaking, this scans
 * your entire source app for dependency install targets, installs them,
 * and then updates the "hash" file used to check node_modules freshness.
 */
async function installDependencies(config: SnowpackConfig) {
  const installTargets = await getInstallTargets(
    config,
    config.packageOptions.source === 'local' ? config.packageOptions.knownEntrypoints : [],
  );
  if (installTargets.length === 0) {
    logger.info('Nothing to install.');
    return;
  }
  // 2. Install dependencies, based on the scan of your final build.
  const installResult = await installRunner({
    config,
    installTargets,
    installOptions,
    shouldPrintStats: false,
  });
  await updateLockfileHash(DEV_DEPENDENCIES_DIR);
  return installResult;
}

// A bit of a hack: we keep this in local state and populate it
// during the "prepare" call. Useful so that we don't need to pass
// this implementation detail around outside of this interface.
// Can't add it to the exported interface due to TS.
let installOptions: EsinstallOptions;

/**
 * Skypack Package Source: A generic interface through which Snowpack
 * interacts with esinstall and your locally installed dependencies.
 */
export default {
  async load(spec: string): Promise<Buffer> {
    const dependencyFileLoc = path.join(DEV_DEPENDENCIES_DIR, spec);
    return fs.readFile(dependencyFileLoc);
  },

  modifyBuildInstallOptions({installOptions, config}) {
    if (config.packageOptions.source !== 'local') {
      return installOptions;
    }
    installOptions.rollup = config.packageOptions.rollup;
    installOptions.sourceMap = config.packageOptions.sourceMap;
    installOptions.polyfillNode = config.packageOptions.polyfillNode;
    installOptions.packageLookupFields = config.packageOptions.packageLookupFields;
    installOptions.packageExportLookupFields = config.packageOptions.packageExportLookupFields;
    return installOptions;
  },

  async prepare(commandOptions: CommandOptions) {
    const {config} = commandOptions;
    // Set the proper install options, in case an install is needed.
    const dependencyImportMapLoc = path.join(DEV_DEPENDENCIES_DIR, 'import-map.json');
    logger.debug(`Using cache folder: ${path.relative(config.root, DEV_DEPENDENCIES_DIR)}`);
    installOptions = merge(commandOptions.config.packageOptions as PackageSourceLocal, {
      dest: DEV_DEPENDENCIES_DIR,
      env: {NODE_ENV: process.env.NODE_ENV || 'development'},
      treeshake: false,
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
      const installResult = await installDependencies(config);
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

  async recoverMissingPackageImport(_, config): Promise<ImportMap> {
    logger.info(colors.yellow('Dependency cache out of date. Updating...'));
    const installResult = await installDependencies(config);
    const dependencyImportMap = installResult!.importMap;
    return dependencyImportMap;
  },

  clearCache() {
    return rimraf.sync(PROJECT_CACHE_DIR);
  },

  getCacheFolder() {
    return PROJECT_CACHE_DIR;
  },
} as PackageSource;
