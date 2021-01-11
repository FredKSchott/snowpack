import globalCacheDir from 'cachedir';
import etag from 'etag';
import findUp from 'find-up';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';

export interface ImportMap {
  imports: {[packageName: string]: string};
}

export const GLOBAL_CACHE_DIR = globalCacheDir('skypack');
export const RESOURCE_CACHE = path.join(GLOBAL_CACHE_DIR, 'pkg-cache-3.0');
export const HAS_CDN_HASH_REGEX = /\-[a-zA-Z0-9]{16,}/;

// A note on cache naming/versioning: We currently version our global caches
// with the version of the last breaking change. This allows us to re-use the
// same cache across versions until something in the data structure changes.
// At that point, bump the version in the cache name to create a new unique
// cache name.
export const BUILD_CACHE = path.join(GLOBAL_CACHE_DIR, 'build-cache-2.7');

const LOCKFILE_HASH_FILE = '.hash';

// NOTE(fks): Must match empty script elements to work properly.
export const HTML_JS_REGEX = /(<script.*?type="?module"?.*?>)(.*?)<\/script>/gms;
export const CSS_REGEX = /@import\s*['"](.*)['"];/gs;
export const SVELTE_VUE_REGEX = /(<script[^>]*>)(.*?)<\/script>/gms;

export const URL_HAS_PROTOCOL_REGEX = /^(\w+:)?\/\//;

const UTF8_FORMATS = ['.css', '.html', '.js', '.map', '.mjs', '.json', '.svg', '.txt', '.xml'];
export function getEncodingType(ext: string): 'utf-8' | undefined {
  return UTF8_FORMATS.includes(ext) ? 'utf-8' : undefined;
}

export async function readLockfile(cwd: string): Promise<ImportMap | null> {
  try {
    var lockfileContents = fs.readFileSync(path.join(cwd, 'snowpack.lock.json'), {
      encoding: 'utf-8',
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
  fs.writeFileSync(loc, JSON.stringify(sortedImportMap, undefined, 2), {encoding: 'utf-8'});
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
      const manifestStr = fs.readFileSync(manifestPath, {encoding: 'utf-8'});
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
    'Try installing rollup-plugin-svelte and adding it to Snowpack (https://www.snowpack.dev/tutorials/svelte)',
  '.vue':
    'Try installing rollup-plugin-vue and adding it to Snowpack (https://www.snowpack.dev/guides/vue)',
};

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

/**
 * For the given import specifier, return an alias entry if one is matched.
 */
export function findMatchingAliasEntry(
  alias: Record<string, string>,
  spec: string,
): {from: string; to: string; type: 'package' | 'path'} | undefined {
  // Only match bare module specifiers. relative and absolute imports should not match
  if (
    spec === '.' ||
    spec === '..' ||
    spec.startsWith('./') ||
    spec.startsWith('../') ||
    spec.startsWith('/') ||
    spec.startsWith('http://') ||
    spec.startsWith('https://')
  ) {
    return undefined;
  }

  for (const [from, to] of Object.entries(alias)) {
    let foundType: 'package' | 'path' = isPackageAliasEntry(to) ? 'package' : 'path';
    const isExactMatch = spec === removeTrailingSlash(from);
    const isDeepMatch = spec.startsWith(addTrailingSlash(from));
    if (isExactMatch || isDeepMatch) {
      return {
        from,
        to,
        type: foundType,
      };
    }
  }
}

/**
 * For the given import specifier, return an alias entry if one is matched.
 */
export function isPackageAliasEntry(val: string): boolean {
  return !path.isAbsolute(val);
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
export function replaceExt(fileName: string, oldExt: string, newExt: string): string {
  const extToReplace = new RegExp(`\\${oldExt}$`, 'i');
  return fileName.replace(extToReplace, newExt);
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

// Source Map spec v3: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.lmz475t4mvbx

/** CSS sourceMappingURL */
export function cssSourceMappingURL(code: string, sourceMappingURL: string) {
  return code + `/*# sourceMappingURL=${sourceMappingURL} */`;
}

/** JS sourceMappingURL */
export function jsSourceMappingURL(code: string, sourceMappingURL: string) {
  return code.replace(/\n*$/, '') + `\n//# sourceMappingURL=${sourceMappingURL}\n`; // strip ending lines & append source map (with linebreaks for safety)
}

export function removeLeadingSlash(path: string) {
  return path.replace(/^[/\\]+/, '');
}

export function removeTrailingSlash(path: string) {
  return path.replace(/[/\\]+$/, '');
}

export function addLeadingSlash(path: string) {
  return path.replace(/^\/?/, '/');
}

export function addTrailingSlash(path: string) {
  return path.replace(/\/?$/, '/');
}
