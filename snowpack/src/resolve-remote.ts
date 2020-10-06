import cacache from 'cacache';
import * as colors from 'kleur/colors';
import PQueue from 'p-queue';
import validatePackageName from 'validate-npm-package-name';
import {SnowpackConfig, ImportMap} from './types/snowpack';
import {fetchCDNResource, PIKA_CDN, RESOURCE_CACHE} from './util.js';
import {logger} from './logger';

/**
 * Given an install specifier, attempt to resolve it from the CDN.
 * If no lockfile exists or if the entry is not found in the lockfile, attempt to resolve
 * it from the CDN directly. Otherwise, use the URL found in the lockfile and attempt to
 * check the local cache first.
 *
 * All resolved URLs are populated into the local cache, where our internal Rollup engine
 * will load them from when it installs your dependencies to disk.
 */
async function resolveDependency(
  installSpecifier: string,
  packageSemver: string,
  lockfile: ImportMap | null,
  canRetry = true,
): Promise<null | string> {
  // Right now, the CDN is only for top-level JS packages. The CDN doesn't support CSS,
  // non-JS assets, and has limited support for deep package imports. Snowpack
  // will automatically fall-back any failed/not-found assets from local
  // node_modules/ instead.
  if (!validatePackageName(installSpecifier).validForNewPackages) {
    return null;
  }

  // Grab the installUrl from our lockfile if it exists, otherwise resolve it yourself.
  let installUrl: string;
  let installUrlType: 'pin' | 'lookup';
  if (lockfile && lockfile.imports[installSpecifier]) {
    installUrl = lockfile.imports[installSpecifier];
    installUrlType = 'pin';
  } else {
    if (packageSemver === 'latest') {
      logger.warn(
        `warn(${installSpecifier}): Not found in "dependencies". Using latest package version...`,
      );
    }
    if (packageSemver.startsWith('npm:@reactesm') || packageSemver.startsWith('npm:@pika/react')) {
      logger.error(
        `React workaround packages no longer needed! Revert to the official React & React-DOM packages.`,
      );
      process.exit(1);
    }
    if (packageSemver.includes(' ') || packageSemver.includes(':')) {
      logger.warn(
        `warn(${installSpecifier}): Can't fetch complex semver "${packageSemver}" from remote CDN.`,
      );
      return null;
    }
    installUrlType = 'lookup';
    installUrl = `${PIKA_CDN}/${installSpecifier}@${packageSemver}`;
  }

  // Hashed CDN urls never change, so its safe to grab them directly from the local cache
  // without a network request.
  if (installUrlType === 'pin') {
    const cachedResult = await cacache.get.info(RESOURCE_CACHE, installUrl).catch(() => null);
    if (cachedResult) {
      if (cachedResult.metadata) {
        const {pinnedUrl} = cachedResult.metadata;
        return pinnedUrl;
      }
    }
  }

  // Otherwise, resolve from the CDN remotely.
  const {statusCode, headers, data} = await fetchCDNResource(installUrl);
  if (statusCode !== 200) {
    logger.warn(`Failed to resolve [${statusCode}]: ${installUrl} (${data})`);
    logger.warn(`Falling back to local copy...`);
    return null;
  }

  let importUrlPath = headers['x-import-url'] as string;
  let pinnedUrlPath = headers['x-pinned-url'] as string;
  const buildStatus = headers['x-import-status'] as string;
  const typesUrlPath = headers['x-typescript-types'] as string | undefined;
  const typesUrl = typesUrlPath && `${PIKA_CDN}${typesUrlPath}`;

  if (installUrlType === 'pin') {
    const pinnedUrl = installUrl;
    await cacache.put(RESOURCE_CACHE, pinnedUrl, data, {
      metadata: {pinnedUrl, typesUrl},
    });
    return pinnedUrl;
  }
  if (pinnedUrlPath) {
    const pinnedUrl = `${PIKA_CDN}${pinnedUrlPath}`;
    await cacache.put(RESOURCE_CACHE, pinnedUrl, data, {
      metadata: {pinnedUrl, typesUrl},
    });
    return pinnedUrl;
  }
  if (buildStatus === 'SUCCESS') {
    logger.warn(`Failed to lookup [${statusCode}]: ${installUrl}`);
    logger.warn(`Falling back to local copy...`);
    return null;
  }
  if (!canRetry || buildStatus === 'FAIL') {
    logger.warn(`Failed to build: ${installSpecifier}@${packageSemver}`);
    logger.warn(`Falling back to local copy...`);
    return null;
  }
  logger.info(
    colors.cyan(
      `Building ${installSpecifier}@${packageSemver}... (This takes a moment, but will be cached for future use)`,
    ),
  );
  if (!importUrlPath) {
    logger.error('X-Import-URL header expected, but none received.');
    process.exit(1);
  }
  const {statusCode: lookupStatusCode} = await fetchCDNResource(importUrlPath);
  if (lookupStatusCode !== 200) {
    logger.error(`Unexpected response [${lookupStatusCode}]: ${PIKA_CDN}${importUrlPath}`);
    process.exit(1);
  }
  return resolveDependency(installSpecifier, packageSemver, lockfile, false);
}

export async function resolveTargetsFromRemoteCDN(
  lockfile: ImportMap | null,
  config: SnowpackConfig,
) {
  const downloadQueue = new PQueue({concurrency: 16});
  const newLockfile: ImportMap = {imports: {}};
  let resolutionError: Error | undefined;

  for (const [installSpecifier, installSemver] of Object.entries(config.webDependencies!)) {
    downloadQueue.add(async () => {
      try {
        const resolvedUrl = await resolveDependency(installSpecifier, installSemver, lockfile);
        if (resolvedUrl) {
          newLockfile.imports[installSpecifier] = resolvedUrl;
        }
      } catch (err) {
        resolutionError = resolutionError || err;
      }
    });
  }

  await downloadQueue.onIdle();
  if (resolutionError) {
    throw resolutionError;
  }

  return newLockfile;
}
