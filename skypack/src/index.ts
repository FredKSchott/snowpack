import cacache from 'cacache';
import got, {Response} from 'got';
import {IncomingHttpHeaders} from 'http';
import {ImportMap, RESOURCE_CACHE, SKYPACK_ORIGIN, HAS_CDN_HASH_REGEX} from './util';

export {rollupPluginSkypack} from './rollup-plugin-remote-cdn';
export {SKYPACK_ORIGIN} from './util';

function parseRawPackageImport(spec: string): [string, string | null] {
  const impParts = spec.split('/');
  if (spec.startsWith('@')) {
    const [scope, name, ...rest] = impParts;
    return [`${scope}/${name}`, rest.join('/') || null];
  }
  const [name, ...rest] = impParts;
  return [name, rest.join('/') || null];
}

export async function generateImportMap(
  webDependencies: Record<string, string | null>,
  inheritFromImportMap?: ImportMap,
): Promise<ImportMap> {
  const newLockfile: ImportMap = inheritFromImportMap ? {imports: {...inheritFromImportMap.imports}} : {imports: {}};
  await Promise.all(
    Object.entries(webDependencies).map(async ([packageName, packageSemver]) => {
      if (packageSemver === null) {
        delete newLockfile.imports[packageName];
        delete newLockfile.imports[packageName + '/'];
        return;
      }
      const lookupResponse = await lookupBySpecifier(packageName, packageSemver);
      if (lookupResponse.error) {
        throw lookupResponse.error;
      }
      if (lookupResponse.pinnedUrl) {
        let keepGoing = true;
        const deepPinnedUrlParts = lookupResponse.pinnedUrl.split('/');
        // TODO: Get ?meta support to get this info via JSON instead of header manipulation
        deepPinnedUrlParts.shift(); // remove ""
        deepPinnedUrlParts.shift(); // remove "pin"

        while (keepGoing) {
          const investigate = deepPinnedUrlParts.pop()!;
          if (HAS_CDN_HASH_REGEX.test(investigate)) {
            keepGoing = false;
            deepPinnedUrlParts.push(investigate);
          }
        }
        newLockfile.imports[packageName] = SKYPACK_ORIGIN + '/' + deepPinnedUrlParts.join('/');
        newLockfile.imports[packageName + '/'] = SKYPACK_ORIGIN + '/' + deepPinnedUrlParts.join('/') + '/';
      }
    }),
  );
  const newLockfileSorted = Object.keys(newLockfile.imports).sort((a, b) => {
    // We want 'xxx/' to come after 'xxx', so we convert it to a space (the character with the highest sort order)
    // See: http://support.ecisolutions.com/doc-ddms/help/reportsmenu/ascii_sort_order_chart.htm
    return a.replace(/\/$/, ' ').localeCompare(b.replace(/\/$/, ' '));
  });
  return {
    imports: newLockfileSorted.reduce((prev, k) => {
      prev[k] = newLockfile.imports[k];
      return prev;
    }, {}),
  };
}

interface ResourceCacheMetadata {
  headers: IncomingHttpHeaders;
  statusCode: number;
  freshUntil: string;
}

export async function fetchCDN(
  resourceUrl: string,
  userAgent?: string,
): Promise<{
  body: string;
  headers: IncomingHttpHeaders;
  statusCode: number;
  isCached: boolean;
  isStale: boolean;
}> {
  if (!resourceUrl.startsWith(SKYPACK_ORIGIN)) {
    resourceUrl = SKYPACK_ORIGIN + resourceUrl;
  }

  const cachedResult = await cacache.get(RESOURCE_CACHE, resourceUrl).catch(() => null);
  if (cachedResult) {
    const cachedResultMetadata = cachedResult.metadata as ResourceCacheMetadata;
    const freshUntil = new Date(cachedResult.metadata.freshUntil);
    if (freshUntil >= new Date()) {
      return {
        isCached: true,
        isStale: false,
        body: cachedResult.data.toString(),
        headers: cachedResultMetadata.headers,
        statusCode: cachedResultMetadata.statusCode,
      };
    }
  }

  let freshResult: Response<string>;
  try {
    freshResult = await got(resourceUrl, {
      headers: {'user-agent': userAgent || `skypack/v0.0.1`},
      throwHttpErrors: false,
    });
  } catch (err) {
    if (cachedResult) {
      const cachedResultMetadata = cachedResult.metadata as ResourceCacheMetadata;
      return {
        isCached: true,
        isStale: true,
        body: cachedResult.data.toString(),
        headers: cachedResultMetadata.headers,
        statusCode: cachedResultMetadata.statusCode,
      };
    }
    throw err;
  }

  const cacheUntilMatch = freshResult.headers['cache-control']?.match(/max-age=(\d+)/);
  if (cacheUntilMatch) {
    var freshUntil = new Date();
    freshUntil.setSeconds(freshUntil.getSeconds() + parseInt(cacheUntilMatch[1]));
    // no need to await, since we `.catch()` to swallow any errors.
    cacache
      .put(RESOURCE_CACHE, resourceUrl, freshResult.body, {
        metadata: {
          headers: freshResult.headers,
          statusCode: freshResult.statusCode,
          freshUntil: freshUntil.toUTCString(),
        } as ResourceCacheMetadata,
      })
      .catch(() => null);
  }

  return {
    body: freshResult.body as string,
    headers: freshResult.headers,
    statusCode: freshResult.statusCode,
    isCached: false,
    isStale: false,
  };
}

export type BuildNewPackageResponse =
  | {error: Error; success: false}
  | {
      error: null;
      success: boolean;
    };

export async function buildNewPackage(
  spec: string,
  semverString?: string,
  userAgent?: string,
): Promise<BuildNewPackageResponse> {
  const [packageName, packagePath] = parseRawPackageImport(spec);
  const lookupUrl =
    `/new/${packageName}` +
    (semverString ? `@${semverString}` : ``) +
    (packagePath ? `/${packagePath}` : ``);
  try {
    const {statusCode} = await fetchCDN(lookupUrl, userAgent);
    return {
      error: null,
      success: statusCode !== 500,
    };
  } catch (err) {
    return {error: err, success: false};
  }
}

export type LookupBySpecifierResponse =
  | {error: Error}
  | {
      error: null;
      body: string;
      isCached: boolean;
      isStale: boolean;
      importStatus: string;
      importUrl: string;
      pinnedUrl: string | undefined;
      typesUrl: string | undefined;
    };

export async function lookupBySpecifier(
  spec: string,
  semverString?: string,
  userAgent?: string,
): Promise<LookupBySpecifierResponse> {
  const [packageName, packagePath] = parseRawPackageImport(spec);
  const lookupUrl =
    `/${packageName}` +
    (semverString ? `@${semverString}` : ``) +
    (packagePath ? `/${packagePath}` : ``);
  try {
    const {body, statusCode, headers, isCached, isStale} = await fetchCDN(lookupUrl, userAgent);
    if (statusCode !== 200) {
      return {error: new Error(body)};
    }
    return {
      error: null,
      body,
      isCached,
      isStale,
      importStatus: headers['x-import-status'] as string,
      importUrl: headers['x-import-url'] as string,
      pinnedUrl: headers['x-pinned-url'] as string | undefined,
      typesUrl: headers['x-typescript-types'] as string | undefined,
    };
  } catch (err) {
    return {error: err};
  }
}

export async function clearCache() {
  return Promise.all([cacache.rm.all(RESOURCE_CACHE)]);
}
