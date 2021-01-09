import {existsSync} from 'fs';
import * as colors from 'kleur/colors';
import path from 'path';
import glob from 'glob';
import {
  clearCache as clearSkypackCache,
  buildNewPackage,
  fetchCDN,
  installTypes,
  lookupBySpecifier,
  rollupPluginSkypack,
  SKYPACK_ORIGIN,
} from 'skypack';
import {logger} from '../logger';
import {ImportMap, LockfileManifest, PackageSource, SnowpackConfig} from '../types';
import {isJavaScript} from '../util';
import rimraf from 'rimraf';

const fetchedPackages = new Set<string>();
function logFetching(packageName: string) {
  if (fetchedPackages.has(packageName)) {
    return;
  }
  fetchedPackages.add(packageName);
  logger.info(
    `Fetching latest ${colors.bold(packageName)} ${colors.dim(
      `→ ${SKYPACK_ORIGIN}/${packageName}`,
    )}`,
    {name: 'source:skypack'},
  );
}

function parseRawPackageImport(spec: string): [string, string | null] {
  const impParts = spec.split('/');
  if (spec.startsWith('@')) {
    const [scope, name, ...rest] = impParts;
    return [`${scope}/${name}`, rest.join('/') || null];
  }
  const [name, ...rest] = impParts;
  return [name, rest.join('/') || null];
}

/**
 * Skypack Package Source: A generic interface through which
 * Snowpack interacts with the Skypack CDN. Used to load dependencies
 * from the CDN during both development and optimized building.
 */
export default {
  async prepare(commandOptions) {
    const {config, lockfile} = commandOptions;
    // Only install types if `packageOptions.types=true`. Otherwise, no need to prepare anything.
    if (config.packageOptions.source === 'skypack' && !config.packageOptions.types) {
      return {imports: {}};
    }
    const dependenciesList = lockfile && (Object.keys(lockfile.dependencies) as string[]);
    if (!lockfile || !dependenciesList || dependenciesList.length === 0) {
      logger.debug('No types to install.');
      return {imports: {}};
    }

    const allTypesFolders = [
      glob.sync('*', {
        nodir: false,
        cwd: path.join(this.getCacheFolder(config), '.snowpack/types'),
      }),
      glob.sync('@*/*', {
        nodir: false,
        cwd: path.join(this.getCacheFolder(config), '.snowpack/types'),
      }),
    ];
    if (JSON.stringify(allTypesFolders.sort()) === JSON.stringify(dependenciesList.sort())) {
      // we are up to date, ignore
      return {imports: {}};
    } else {
      await rimraf.sync(path.join(this.getCacheFolder(config), '.snowpack/types'));
    }

    for (const packageName of dependenciesList) {
      logFetching(packageName);
      await installTypes(
        packageName,
        lockfile.dependencies[packageName],
        path.join(this.getCacheFolder(config), '.snowpack/types'),
      ).catch(() => 'thats fine!');
    }
    // Skypack resolves imports on the fly, so no import map needed.
    return {imports: {}};
  },

  async modifyBuildInstallConfig({
    config,
    lockfile,
  }: {
    config: SnowpackConfig;
    lockfile: LockfileManifest | null;
  }) {
    config.installOptions.lockfile = lockfile || undefined;
    config.installOptions.rollup = config.installOptions.rollup || {};
    config.installOptions.rollup.plugins = config.installOptions.rollup.plugins || [];
    config.installOptions.rollup.plugins.push(rollupPluginSkypack({}) as Plugin);
  },

  async load(
    spec: string,
    {config, lockfile}: {config: SnowpackConfig; lockfile: LockfileManifest | null},
  ): Promise<string | Buffer> {
    let body: Buffer;
    if (
      spec.startsWith('-/') ||
      spec.startsWith('pin/') ||
      spec.startsWith('new/') ||
      spec.startsWith('error/')
    ) {
      body = (await fetchCDN(`/${spec}`)).body;
    } else {
      const [packageName, packagePath] = parseRawPackageImport(spec);
      if (lockfile && lockfile.imports[spec]) {
        body = (await fetchCDN(lockfile.imports[spec])).body;
      } else if (lockfile && lockfile.imports[packageName + '/']) {
        body = (await fetchCDN(lockfile.imports[packageName + '/'] + packagePath)).body;
      } else {
        const _packageSemver = lockfile?.dependencies && lockfile.dependencies[packageName];
        if (!_packageSemver) {
          logFetching(packageName);
        }
        const packageSemver = _packageSemver || 'latest';
        let lookupResponse = await lookupBySpecifier(spec, packageSemver);
        if (!lookupResponse.error && lookupResponse.importStatus === 'NEW') {
          const buildResponse = await buildNewPackage(spec, packageSemver);
          if (!buildResponse.success) {
            throw new Error('Package could not be built!');
          }
          lookupResponse = await lookupBySpecifier(spec, packageSemver);
        }
        if (lookupResponse.error) {
          throw lookupResponse.error;
        }
        // Trigger a type fetch asynchronously. We want to resolve the JS as fast as possible, and
        // the result of this is totally disconnected from the loading flow.
        if (!existsSync(path.join(this.getCacheFolder(config), '.snowpack/types', packageName))) {
          installTypes(
            packageName,
            packageSemver,
            path.join(this.getCacheFolder(config), '.snowpack/types'),
          ).catch(() => 'thats fine!');
        }
        body = lookupResponse.body;
      }
    }
    const ext = path.extname(spec);
    if (!ext || isJavaScript(spec)) {
      return body
        .toString()
        .replace(/(from|import) \'\//g, `$1 '${config.buildOptions.webModulesUrl}/`)
        .replace(/(from|import) \"\//g, `$1 "${config.buildOptions.webModulesUrl}/`);
    }

    return body;
  },

  resolvePackageImport(missingPackage: string, _: ImportMap, config: SnowpackConfig): string {
    return path.posix.join(config.buildOptions.webModulesUrl, missingPackage);
  },

  async recoverMissingPackageImport(): Promise<ImportMap> {
    throw new Error('Unexpected Error: No such thing as a "missing" package import with Skypack.');
  },

  clearCache() {
    return clearSkypackCache();
  },

  getCacheFolder(config) {
    return (
      (config.packageOptions.source === 'skypack' && config.packageOptions.cache) ||
      path.join(config.root, '.snowpack')
    );
  },
} as PackageSource;
