import fs from 'fs';
import cacache from 'cacache';
import mkdirp from 'mkdirp';
import path from 'path';
import {OutputOptions, Plugin, ResolvedId} from 'rollup';
import tar from 'tar';
import url from 'url';
import {fetchCDNResource, HAS_CDN_HASH_REGEX, PIKA_CDN, RESOURCE_CACHE} from '../util';

const CACHED_FILE_ID_PREFIX = 'snowpack-pkg-cache:';
const PIKA_CDN_TRIM_LENGTH = PIKA_CDN.length;
/**
 * rollup-plugin-remote-cdn
 *
 * Load import URLs from a remote CDN, sitting behind a local cache. The local
 * cache acts as a go-between for the resolve & load step: when we get back a
 * successful CDN resolution, we save the file to the local cache and then tell
 * rollup that it's safe to load from the cache in the `load()` hook.
 */
export function rollupPluginDependencyCache({
  installTypes,
  log,
}: {
  installTypes: boolean;
  log: (url: string) => void;
}) {
  const allTypesToInstall = new Set<string>();
  return {
    name: 'snowpack:rollup-plugin-remote-cdn',
    async resolveId(source: string, importer) {
      let cacheKey: string;
      if (source.startsWith(PIKA_CDN)) {
        cacheKey = source;
      } else if (source.startsWith('/-/')) {
        cacheKey = PIKA_CDN + source;
      } else if (source.startsWith('/pin/')) {
        cacheKey = PIKA_CDN + source;
      } else {
        return null;
      }

      // If the source path is a CDN path including a hash, it's assumed the
      // file will never change and it is safe to pull from our local cache
      // without a network request.
      log(cacheKey);
      if (HAS_CDN_HASH_REGEX.test(cacheKey)) {
        const cachedResult = await cacache.get
          .info(RESOURCE_CACHE, cacheKey)
          .catch((/* ignore */) => null);
        if (cachedResult) {
          return CACHED_FILE_ID_PREFIX + cacheKey;
        }
      }

      // Otherwise, make the remote request and cache the file on success.
      const response = await fetchCDNResource(cacheKey);
      if (response.statusCode === 200) {
        const typesUrlPath = response.headers['x-typescript-types'] as string | undefined;
        const pinnedUrlPath = response.headers['x-pinned-url'] as string;
        const typesUrl = typesUrlPath && `${PIKA_CDN}${typesUrlPath}`;
        const pinnedUrl = pinnedUrlPath && `${PIKA_CDN}${pinnedUrlPath}`;
        await cacache.put(RESOURCE_CACHE, cacheKey, response.body, {
          metadata: {pinnedUrl, typesUrl},
        });
        return CACHED_FILE_ID_PREFIX + cacheKey;
      }

      // If lookup failed, skip this plugin and resolve the import locally instead.
      // TODO: Log that this has happened (if some sort of verbose mode is enabled).
      const packageName = cacheKey
        .substring(PIKA_CDN_TRIM_LENGTH)
        .replace('/-/', '')
        .replace('/pin/', '')
        .split('@')[0];
      return this.resolve(packageName, importer!, {skipSelf: true}).then((resolved) => {
        let finalResult = resolved;
        if (!finalResult) {
          finalResult = ({id: packageName} as any) as ResolvedId;
        }
        return finalResult;
      });
    },
    async load(id: string) {
      if (!id.startsWith(CACHED_FILE_ID_PREFIX)) {
        return null;
      }
      const cacheKey = id.substring(CACHED_FILE_ID_PREFIX.length);
      log(cacheKey);
      const cachedResult = await cacache.get(RESOURCE_CACHE, cacheKey);
      const typesUrl: string | undefined = cachedResult.metadata?.typesUrl;
      if (typesUrl && installTypes) {
        const typesTarballUrl = typesUrl.replace(/(mode=types.*?)\/.*/, '$1/all.tgz');
        allTypesToInstall.add(typesTarballUrl);
      }
      return cachedResult.data.toString('utf8');
    },
    async writeBundle(options: OutputOptions) {
      if (!installTypes) {
        return;
      }
      await mkdirp(path.join(options.dir!, '.types'));
      const tempDir = await cacache.tmp.mkdir(RESOURCE_CACHE);
      for (const typesTarballUrl of allTypesToInstall) {
        let tarballContents: Buffer;
        const cachedTarball = await cacache
          .get(RESOURCE_CACHE, typesTarballUrl)
          .catch((/* ignore */) => null);
        if (cachedTarball) {
          tarballContents = cachedTarball.data;
        } else {
          const tarballResponse = await fetchCDNResource(typesTarballUrl, 'buffer');
          if (tarballResponse.statusCode !== 200) {
            continue;
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
        const typesPackageLoc = path.join(options.dir!, `.types/${typesPackageName}`);
        await mkdirp(typesPackageLoc);
        await tar.x({
          file: typesPackageTarLoc,
          cwd: typesPackageLoc,
        });
      }
    },
  } as Plugin;
}
