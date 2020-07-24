import cacache from 'cacache';
import globalCacheDir from 'cachedir';
import etag from 'etag';
import execa from 'execa';
import projectCacheDir from 'find-cache-dir';
import findUp from 'find-up';
import fs from 'fs';
import got, {CancelableRequest, Response} from 'got';
import mkdirp from 'mkdirp';
import open from 'open';
import path from 'path';
import rimraf from 'rimraf';
import {SnowpackConfig} from './config';

export const PIKA_CDN = `https://cdn.pika.dev`;
export const GLOBAL_CACHE_DIR = globalCacheDir('snowpack');

// A note on cache naming/versioning: We currently version our global caches
// with the version of the last breaking change. This allows us to re-use the
// same cache across versions until something in the data structure changes.
// At that point, bump the version in the cache name to create a new unique
// cache name.
export const RESOURCE_CACHE = path.join(GLOBAL_CACHE_DIR, 'pkg-cache-1.4');
export const BUILD_CACHE = path.join(GLOBAL_CACHE_DIR, 'build-cache-2.6');

export const PROJECT_CACHE_DIR = projectCacheDir({name: 'snowpack'});
export const DEV_DEPENDENCIES_DIR = path.join(PROJECT_CACHE_DIR, 'dev');
const LOCKFILE_HASH_FILE = '.hash';

export const HAS_CDN_HASH_REGEX = /\-[a-zA-Z0-9]{16,}/;
// NOTE(fks): Must match empty script elements to work properly.
export const HTML_JS_REGEX = /(<script.*?type="?module"?.*?>)(.*?)<\/script>/gms;
export const URL_HAS_PROTOCOL_REGEX = /^(\w+:)?\/\//;

export interface ImportMap {
  imports: {[packageName: string]: string};
}

export interface CommandOptions {
  cwd: string;
  config: SnowpackConfig;
  lockfile: ImportMap | null;
  pkgManifest: any;
}

export function isYarn(cwd: string) {
  return fs.existsSync(path.join(cwd, 'yarn.lock'));
}

const UTF8_FORMATS = ['.css', '.html', '.js', '.mjs', '.json', '.svg', '.txt', '.xml'];
export function getEncodingType(ext: string): 'utf-8' | 'binary' {
  return UTF8_FORMATS.includes(ext) ? 'utf-8' : 'binary';
}

export async function readLockfile(cwd: string): Promise<ImportMap | null> {
  try {
    var lockfileContents = fs.readFileSync(path.join(cwd, 'snowpack.lock.json'), {
      encoding: 'utf8',
    });
  } catch (err) {
    // no lockfile found, ignore and continue
    return null;
  }
  // If this fails, we actually do want to alert the user by throwing
  return JSON.parse(lockfileContents);
}

export async function writeLockfile(loc: string, importMap: ImportMap): Promise<void> {
  const sortedImportMap: ImportMap = {imports: {}};
  for (const key of Object.keys(importMap.imports).sort()) {
    sortedImportMap.imports[key] = importMap.imports[key];
  }
  fs.writeFileSync(loc, JSON.stringify(sortedImportMap, undefined, 2), {encoding: 'utf8'});
}

export function fetchCDNResource(
  resourceUrl: string,
  responseType?: 'text' | 'json' | 'buffer',
): Promise<CancelableRequest<Response>> {
  if (!resourceUrl.startsWith(PIKA_CDN)) {
    resourceUrl = PIKA_CDN + resourceUrl;
  }
  // @ts-ignore - TS doesn't like responseType being unknown amount three options
  return got(resourceUrl, {
    responseType: responseType,
    headers: {'user-agent': `snowpack/v1.4 (https://snowpack.dev)`},
    throwHttpErrors: false,
  });
}

export function isTruthy<T>(item: T | false | null | undefined): item is T {
  return Boolean(item);
}

/** Get the package name + an entrypoint within that package (if given). */
export function parsePackageImportSpecifier(imp: string): [string, string | null] {
  const impParts = imp.split('/');
  if (imp.startsWith('@')) {
    const [scope, name, ...rest] = impParts;
    return [`${scope}/${name}`, rest.join('/') || null];
  }
  const [name, ...rest] = impParts;
  return [name, rest.join('/') || null];
}

/**
 * Given a package name, look for that package's package.json manifest.
 * Return both the manifest location (if believed to exist) and the
 * manifest itself (if found).
 *
 * NOTE: You used to be able to require() a package.json file directly,
 * but now with export map support in Node v13 that's no longer possible.
 */
export function resolveDependencyManifest(dep: string, cwd: string): [string | null, any | null] {
  // Attempt #1: Resolve the dependency manifest normally. This works for most
  // packages, but fails when the package defines an export map that doesn't
  // include a package.json. If we detect that to be the reason for failure,
  // move on to our custom implementation.
  try {
    const depManifest = require.resolve(`${dep}/package.json`, {paths: [cwd]});
    return [depManifest, require(depManifest)];
  } catch (err) {
    // if its an export map issue, move on to our manual resolver.
    if (err.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
      return [null, null];
    }
  }

  // Attempt #2: Resolve the dependency manifest manually. This involves resolving
  // the dep itself to find the entrypoint file, and then haphazardly replacing the
  // file path within the package with a "./package.json" instead. It's not as
  // thorough as Attempt #1, but it should work well until export maps become more
  // established & move out of experimental mode.
  let result = [null, null] as [string | null, any | null];
  try {
    const fullPath = require.resolve(dep, {paths: [cwd]});
    // Strip everything after the package name to get the package root path
    // NOTE: This find-replace is very gross, replace with something like upath.
    const searchPath = `${path.sep}node_modules${path.sep}${dep.replace('/', path.sep)}`;
    const indexOfSearch = fullPath.lastIndexOf(searchPath);
    if (indexOfSearch >= 0) {
      const manifestPath =
        fullPath.substring(0, indexOfSearch + searchPath.length + 1) + 'package.json';
      result[0] = manifestPath;
      const manifestStr = fs.readFileSync(manifestPath, {encoding: 'utf8'});
      result[1] = JSON.parse(manifestStr);
    }
  } catch (err) {
    // ignore
  } finally {
    return result;
  }
}

/**
 * If Rollup erred parsing a particular file, show suggestions based on its
 * file extension (note: lowercase is fine).
 */
export const MISSING_PLUGIN_SUGGESTIONS: {[ext: string]: string} = {
  '.svelte':
    'Try installing rollup-plugin-svelte and adding it to Snowpack (https://www.snowpack.dev/#custom-rollup-plugins)',
  '.vue':
    'Try installing rollup-plugin-vue and adding it to Snowpack (https://www.snowpack.dev/#custom-rollup-plugins)',
};

const appNames = {
  win32: {
    brave: 'brave',
    chrome: 'chrome',
  },
  darwin: {
    brave: 'Brave Browser',
    chrome: 'Google Chrome',
  },
  linux: {
    brave: 'brave',
    chrome: 'google-chrome',
  },
};

export async function openInBrowser(
  protocol: string,
  hostname: string,
  port: number,
  browser: string,
) {
  const url = `${protocol}//${hostname}:${port}`;
  browser = /chrome/i.test(browser)
    ? appNames[process.platform]['chrome']
    : /brave/i.test(browser)
    ? appNames[process.platform]['brave']
    : browser;
  if (process.platform === 'darwin' && /chrome|default/i.test(browser)) {
    // If we're on macOS, and we haven't requested a specific browser,
    // we can try opening Chrome with AppleScript. This lets us reuse an
    // existing tab when possible instead of creating a new one.
    try {
      await execa.command('ps cax | grep "Google Chrome"', {
        shell: true,
      });
      await execa('osascript ../assets/openChrome.applescript "' + encodeURI(url) + '"', {
        cwd: __dirname,
        stdio: 'ignore',
        shell: true,
      });
      return true;
    } catch (err) {
      // If macOS auto-reuse doesn't work, just open normally, using default browser.
      open(url);
    }
  } else {
    browser === 'default' ? open(url) : open(url, {app: browser});
  }
}

export async function checkLockfileHash(dir: string) {
  const lockfileLoc = await findUp(['package-lock.json', 'yarn.lock']);
  if (!lockfileLoc) {
    return true;
  }
  const hashLoc = path.join(dir, LOCKFILE_HASH_FILE);
  const newLockHash = etag(await fs.promises.readFile(lockfileLoc, 'utf-8'));
  const oldLockHash = await fs.promises.readFile(hashLoc, 'utf-8').catch(() => '');
  return newLockHash === oldLockHash;
}

export async function updateLockfileHash(dir: string) {
  const lockfileLoc = await findUp(['package-lock.json', 'yarn.lock']);
  if (!lockfileLoc) {
    return;
  }
  const hashLoc = path.join(dir, LOCKFILE_HASH_FILE);
  const newLockHash = etag(await fs.promises.readFile(lockfileLoc));
  await mkdirp(path.dirname(hashLoc));
  await fs.promises.writeFile(hashLoc, newLockHash);
}

export async function clearCache() {
  return Promise.all([
    cacache.rm.all(RESOURCE_CACHE),
    cacache.rm.all(BUILD_CACHE),
    rimraf.sync(PROJECT_CACHE_DIR),
  ]);
}

/**
 * Given an import string and a list of scripts, return the mount script that matches the import.
 *
 * `mount ./src --to /_dist_` and `mount src --to /_dist_` match `src/components/Button`
 * `mount src --to /_dist_` does not match `package/components/Button`
 */
export function findMatchingMountScript(
  scripts: Record<string, string>,
  spec: string,
): [string, string] | null | undefined {
  // Only match bare module specifiers. relative and absolute imports should not match
  if (
    spec.startsWith('./') ||
    spec.startsWith('../') ||
    spec.startsWith('/') ||
    spec.startsWith('http://') ||
    spec.startsWith('https://')
  ) {
    return null;
  }
  return Object.entries(scripts).find(([fromDisk]) => spec.startsWith(fromDisk));
}

/** Get full extensions of files */
export function getExt(fileName: string) {
  return {
    /** base extension (e.g. `.js`) */
    baseExt: path.extname(fileName).toLocaleLowerCase(),
    /** full extension, if applicable (e.g. `.proxy.js`) */
    expandedExt: path.basename(fileName).replace(/[^.]+/, '').toLocaleLowerCase(),
  };
}

/** Replace file extensions */
export function replaceExt(
  fileName: string,
  newExtension: string,
  replaceExpandedExt: boolean = false,
): string {
  const {baseExt, expandedExt} = getExt(fileName);
  const extToReplace = new RegExp(`\\${replaceExpandedExt ? expandedExt : baseExt}$`, 'i');
  return fileName.replace(extToReplace, newExtension);
}

/**
 * Sanitizes npm packages that end in .js (e.g `tippy.js` -> `tippyjs`).
 * This is necessary because Snowpack can’t create both a file and directory
 * that end in .js.
 */
export function sanitizePackageName(filepath: string): string {
  const dirs = filepath.split('/');
  const file = dirs.pop() as string;
  return [...dirs.map((path) => path.replace(/\.js$/i, 'js')), file].join('/');
}
