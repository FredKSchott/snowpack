import {existsSync} from 'fs';
import * as colors from 'kleur/colors';
import path from 'path';
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
import {convertLockfileToSkypackImportMap, isJavaScript} from '../util';
import rimraf from 'rimraf';

const fetchedPackages = new Set<string>();
function logFetching(packageName: string, packageSemver: string | undefined) {
  if (fetchedPackages.has(packageName)) {
    return;
  }
  fetchedPackages.add(packageName);
  logger.info(
    `import ${colors.bold(packageName + (packageSemver ? `@${packageSemver}` : ''))} ${colors.dim(
      `→ ${SKYPACK_ORIGIN}/${packageName}`,
    )}`,
    {name: 'skypack'},
  );
  if (!packageSemver) {
    logger.info(colors.yellow(`pin project to this version: \`snowpack add ${packageName}\``), {
      name: 'skypack',
    });
  }
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
    const lockEntryList = lockfile && (Object.keys(lockfile.lock) as string[]);
    if (!lockfile || !lockEntryList || lockEntryList.length === 0) {
      return {imports: {}};
    }

    logger.info('checking for new TypeScript types...', {name: 'packageOptions.types'});
    await rimraf.sync(path.join(this.getCacheFolder(config), '.snowpack/types'));
    for (const lockEntry of lockEntryList) {
      const [packageName, semverRange] = lockEntry.split('#');
      const exactVersion = lockfile.lock[lockEntry]?.substr(packageName.length + 1);
      await installTypes(
        packageName,
        exactVersion || semverRange,
        path.join(this.getCacheFolder(config), 'types'),
      ).catch((err) => logger.debug('dts fetch error: ' + err.message));
    }
    // Skypack resolves imports on the fly, so no import map needed.
    logger.info(`types updated. ${colors.dim('→ ./.snowpack/types')}`, {
      name: 'packageOptions.types',
    });
    return {imports: {}};
  },

  modifyBuildInstallOptions({installOptions, lockfile}) {
    installOptions.importMap = lockfile ? convertLockfileToSkypackImportMap(lockfile) : undefined;
    installOptions.rollup = installOptions.rollup || {};
    installOptions.rollup.plugins = installOptions.rollup.plugins || [];
    installOptions.rollup.plugins.push(rollupPluginSkypack({}) as Plugin);
    // config.installOptions.lockfile = lockfile || undefined;
    return installOptions;
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
      if (lockfile && lockfile.dependencies[packageName]) {
        const lockEntry = packageName + '#' + lockfile.dependencies[packageName];
        if (packagePath) {
          body = (await fetchCDN('/' + lockfile.lock[lockEntry] + '/' + packagePath)).body;
        } else {
          body = (await fetchCDN('/' + lockfile.lock[lockEntry])).body;
        }
      } else {
        const _packageSemver = lockfile?.dependencies && lockfile.dependencies[packageName];
        logFetching(packageName, _packageSemver);
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
