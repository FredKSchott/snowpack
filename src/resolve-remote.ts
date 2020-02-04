import cacache from 'cacache';
import PQueue from 'p-queue';
import path from 'path';
import validatePackageName from 'validate-npm-package-name';
import {SnowpackConfig} from './config.js';
import {InstallTarget} from './scan-imports.js';
import {fetchCDNResource, ImportMap, PIKA_CDN, RESOURCE_CACHE, HAS_CDN_HASH_REGEX} from './util.js';

export async function resolveFromRemoteCDN(
  installTargets: InstallTarget[],
  lockfile: ImportMap | null,
  pkgManifest: any,
  config: SnowpackConfig,
) {
  const {dependencies} = config;
  const downloadQueue = new PQueue({concurrency: 16});
  const newLockfile: ImportMap = {imports: {}};

  async function handleTopLevel(installSpecifier: string) {
    // Right now, the CDN is only for JS packages. The CDN doesn't support CSS,
    // non-JS assets, and has limited support for deep package imports. Snowpack
    // will automatically fall-back any failed/not-found assets from local
    // node_modules/ instead.
    const isPackage = !validatePackageName(installSpecifier).validForNewPackages;
    if (isPackage && path.extname(installSpecifier)) {
      return;
    }
    let installUrl: string;
    if (lockfile && lockfile.imports[installSpecifier]) {
      installUrl = lockfile.imports[installSpecifier];
    } else {
      const packageSemver: string =
        (dependencies || {})[installSpecifier] ||
        (pkgManifest.dependencies || {})[installSpecifier] ||
        (pkgManifest.devDependencies || {})[installSpecifier] ||
        (pkgManifest.peerDependencies || {})[installSpecifier] ||
        'latest';
      if (packageSemver === 'latest') {
        console.warn(
          `warn(${installSpecifier}): Not found in "dependencies". Using latest package version...`,
        );
      }
      if (
        packageSemver.startsWith('npm:@reactesm') ||
        packageSemver.startsWith('npm:@pika/react')
      ) {
        throw new Error(
          `React workarounds no longer needed in --source=pika mode. Revert to the official React & React-DOM packages.`,
        );
      }
      if (packageSemver.includes(' ') || packageSemver.includes(':')) {
        console.warn(
          `warn(${installSpecifier}): Can't fetch complex semver "${packageSemver}" from remote CDN.`,
        );
        return;
      }
      installUrl = `${PIKA_CDN}/${installSpecifier}@${packageSemver}`;
    }
    if (HAS_CDN_HASH_REGEX.test(installUrl)) {
      const cachedResult = await cacache.get.info(RESOURCE_CACHE, installUrl).catch(() => null);
      if (cachedResult) {
        const {pinnedUrl} = cachedResult.metadata;
        newLockfile.imports[installSpecifier] = `${PIKA_CDN}${pinnedUrl}`;
        return;
      }
    }
    const {statusCode, headers, body} = await fetchCDNResource(installUrl);
    if (statusCode !== 200) {
      throw new Error(`Failed to resolve [${statusCode}]: ${installUrl}\n${body}`);
    }
    const pinnedUrl = headers['x-pinned-url'] as string;
    if (!pinnedUrl) {
      throw new Error('X-Pinned-URL Header expected, but none received.');
    }
    await cacache.put(RESOURCE_CACHE, installUrl, body, {metadata: {pinnedUrl}});
    newLockfile.imports[installSpecifier] = `${PIKA_CDN}${pinnedUrl}`;
  }

  const allInstallSpecifiers = new Set(installTargets.map(dep => dep.specifier));
  for (const targetSpecifier of allInstallSpecifiers) {
    downloadQueue.add(() => handleTopLevel(targetSpecifier));
  }

  await downloadQueue.onIdle();

  return newLockfile;
}
