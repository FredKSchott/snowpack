import mkdirp from 'mkdirp';
import cacache from 'cacache';
import path from 'path';
import tar from 'tar';
import fs from 'fs';
import url from 'url';
import got, {Response} from 'got';
import {IncomingHttpHeaders} from 'http';
import {ImportMap, RESOURCE_CACHE, HAS_CDN_HASH_REGEX} from './util';

export {rollupPluginSkypack} from './rollup-plugin-remote-cdn';
export const SKYPACK_ORIGIN = 'https://cdn.skypack.dev';

function parseRawPackageImport(spec: string): [string, string | null] {
  const impParts = spec.split('/');
  if (spec.startsWith('@')) {
    const [scope, name, ...rest] = impParts;
    return [`${scope}/${name}`, rest.join('/') || null];
  }
  const [name, ...rest] = impParts;
  return [name, rest.join('/') || null];
}

export class SkypackSDK {
  origin: string;

  constructor(options: {origin?: string} = {}) {
    this.origin = options.origin || SKYPACK_ORIGIN;
  }

  async generateImportMap(
    webDependencies: Record<string, string | null>,
    inheritFromImportMap?: ImportMap,
  ): Promise<ImportMap> {
    const newLockfile: ImportMap = inheritFromImportMap
      ? {imports: {...inheritFromImportMap.imports}}
      : {imports: {}};
    await Promise.all(
      Object.entries(webDependencies).map(async ([packageName, packageSemver]) => {
        if (packageSemver === null) {
          delete newLockfile.imports[packageName];
          delete newLockfile.imports[packageName + '/'];
          return;
        }
        const lookupResponse = await this.lookupBySpecifier(packageName, packageSemver);
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
          newLockfile.imports[packageName] = this.origin + '/' + deepPinnedUrlParts.join('/');
          newLockfile.imports[packageName + '/'] =
            this.origin + '/' + deepPinnedUrlParts.join('/') + '/';
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

  async fetch(
    resourceUrl: string,
    userAgent?: string,
  ): Promise<{
    body: Buffer;
    headers: IncomingHttpHeaders;
    statusCode: number;
    isCached: boolean;
    isStale: boolean;
  }> {
    if (!resourceUrl.startsWith(this.origin)) {
      resourceUrl = this.origin + resourceUrl;
    }

    const cachedResult = await cacache.get(RESOURCE_CACHE, resourceUrl).catch(() => null);
    if (cachedResult) {
      const cachedResultMetadata = cachedResult.metadata as ResourceCacheMetadata;
      const freshUntil = new Date(cachedResult.metadata.freshUntil);
      if (freshUntil >= new Date()) {
        return {
          isCached: true,
          isStale: false,
          body: cachedResult.data,
          headers: cachedResultMetadata.headers,
          statusCode: cachedResultMetadata.statusCode,
        };
      }
    }

    let freshResult: Response<Buffer>;
    try {
      freshResult = await got(resourceUrl, {
        headers: {'user-agent': userAgent || `skypack/v0.0.1`},
        throwHttpErrors: false,
        responseType: 'buffer',
      });
    } catch (err) {
      if (cachedResult) {
        const cachedResultMetadata = cachedResult.metadata as ResourceCacheMetadata;
        return {
          isCached: true,
          isStale: true,
          body: cachedResult.data,
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
      body: freshResult.body,
      headers: freshResult.headers,
      statusCode: freshResult.statusCode,
      isCached: false,
      isStale: false,
    };
  }

  async buildNewPackage(
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
      const {statusCode} = await this.fetch(lookupUrl, userAgent);
      return {
        error: null,
        success: statusCode !== 500,
      };
    } catch (err) {
      return {error: err, success: false};
    }
  }

  async lookupBySpecifier(
    spec: string,
    semverString?: string,
    qs?: string,
    userAgent?: string,
  ): Promise<LookupBySpecifierResponse> {
    const [packageName, packagePath] = parseRawPackageImport(spec);
    const lookupUrl =
      `/${packageName}` +
      (semverString ? `@${semverString}` : ``) +
      (packagePath ? `/${packagePath}` : ``) +
      (qs ? `?${qs}` : ``);
    try {
      const {body, statusCode, headers, isCached, isStale} = await this.fetch(lookupUrl, userAgent);
      if (statusCode !== 200) {
        return {error: new Error(body.toString())};
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

  async installTypes(spec: string, semverString?: string, dir?: string) {
    dir = dir || path.join(process.cwd(), '.types');
    const lookupResult = await this.lookupBySpecifier(spec, semverString, 'dts');
    if (lookupResult.error) {
      throw lookupResult.error;
    }
    if (!lookupResult.typesUrl) {
      throw new Error(`Skypack CDN: No types found "${spec}"`);
    }

    const typesTarballUrl = lookupResult.typesUrl.replace(/(mode=types.*?)\/.*/, '$1/all.tgz');

    await mkdirp(dir);
    const tempDir = await cacache.tmp.mkdir(RESOURCE_CACHE);

    let tarballContents: Buffer;
    const cachedTarball = await cacache
      .get(RESOURCE_CACHE, typesTarballUrl)
      .catch((/* ignore */) => null);
    if (cachedTarball) {
      tarballContents = cachedTarball.data;
    } else {
      const tarballResponse = await this.fetch(typesTarballUrl);
      if (tarballResponse.statusCode !== 200) {
        throw new Error(tarballResponse.body.toString());
      }
      tarballContents = (tarballResponse.body as any) as Buffer;
      await cacache.put(RESOURCE_CACHE, typesTarballUrl, tarballContents);
    }

    const typesUrlParts = url.parse(typesTarballUrl).pathname!.split('/');
    const typesPackageName = url.parse(typesTarballUrl).pathname!.startsWith('/-/@')
      ? typesUrlParts[2] + '/' + typesUrlParts[3].split('@')[0]
      : typesUrlParts[2].split('@')[0];
    const typesPackageTarLoc = path.join(tempDir, `${typesPackageName}.tgz`);
    if (typesPackageName.includes('/')) {
      await mkdirp(path.dirname(typesPackageTarLoc));
    }
    fs.writeFileSync(typesPackageTarLoc, tarballContents);
    const typesPackageLoc = path.join(dir, typesPackageName);
    await mkdirp(typesPackageLoc);
    await tar.x({
      file: typesPackageTarLoc,
      cwd: typesPackageLoc,
    });
  }
}

interface ResourceCacheMetadata {
  headers: IncomingHttpHeaders;
  statusCode: number;
  freshUntil: string;
}

export type BuildNewPackageResponse =
  | {error: Error; success: false}
  | {
      error: null;
      success: boolean;
    };

export type LookupBySpecifierResponse =
  | {error: Error}
  | {
      error: null;
      body: Buffer;
      isCached: boolean;
      isStale: boolean;
      importStatus: string;
      importUrl: string;
      pinnedUrl: string | undefined;
      typesUrl: string | undefined;
    };

export async function clearCache() {
  return cacache.rm.all(RESOURCE_CACHE);
}
