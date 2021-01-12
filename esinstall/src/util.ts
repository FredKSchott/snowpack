import {promises as fs, realpathSync, readFileSync} from 'fs';
import path from 'path';
import url from 'url';
import validatePackageName from 'validate-npm-package-name';
import {InstallTarget, ImportMap, PackageManifest} from './types';

// We need to use eval here to prevent Rollup from detecting this use of `require()`
export const NATIVE_REQUIRE = eval('require');

export async function writeLockfile(loc: string, importMap: ImportMap): Promise<void> {
  const sortedImportMap: ImportMap = {imports: {}};
  for (const key of Object.keys(importMap.imports).sort()) {
    sortedImportMap.imports[key] = importMap.imports[key];
  }
  return fs.writeFile(loc, JSON.stringify(sortedImportMap, undefined, 2), {encoding: 'utf8'});
}

export function isRemoteUrl(val: string): boolean {
  return val.startsWith('//') || !!url.parse(val).protocol?.startsWith('http');
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
export function resolveDependencyManifest(
  dep: string,
  cwd: string,
): [string | null, PackageManifest | null] {
  // Attempt #1: Resolve the dependency manifest normally. This works for most
  // packages, but fails when the package defines an export map that doesn't
  // include a package.json. If we detect that to be the reason for failure,
  // move on to our custom implementation.
  try {
    const depManifest = realpathSync.native(require.resolve(`${dep}/package.json`, {paths: [cwd]}));
    return [depManifest, NATIVE_REQUIRE(depManifest)];
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
  const result = [null, null] as [string | null, any | null];
  const fullPath = realpathSync.native(require.resolve(dep, {paths: [cwd]}));
  // Strip everything after the package name to get the package root path
  // NOTE: This find-replace is very gross, replace with something like upath.
  const searchPath = `${path.sep}node_modules${path.sep}${dep.replace('/', path.sep)}`;
  const indexOfSearch = fullPath.lastIndexOf(searchPath);
  if (indexOfSearch >= 0) {
    const manifestPath =
      fullPath.substring(0, indexOfSearch + searchPath.length + 1) + 'package.json';
    result[0] = manifestPath;
    const manifestStr = readFileSync(manifestPath, {encoding: 'utf8'});
    result[1] = JSON.parse(manifestStr);
  }
  return result;
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

/**
 * Formats the snowpack dependency name from a "webDependencies" input value:
 * 2. Remove any ".js"/".mjs" extension (will be added automatically by Rollup)
 */
export function getWebDependencyName(dep: string): string {
  return validatePackageName(dep).validForNewPackages
    ? dep.replace(/\.js$/i, 'js') // if this is a top-level package ending in .js, replace with js (e.g. tippy.js -> tippyjs)
    : dep.replace(/\.m?js$/i, ''); // otherwise simply strip the extension (Rollup will resolve it)
}

/** Add / to beginning of string (but don’t double-up) */
export function addLeadingSlash(path: string) {
  return path.replace(/^\/?/, '/');
}

/** Add / to the end of string (but don’t double-up) */
export function addTrailingSlash(path: string) {
  return path.replace(/\/?$/, '/');
}

/** Remove \ and / from beginning of string */
export function removeLeadingSlash(path: string) {
  return path.replace(/^[/\\]+/, '');
}

/** Remove \ and / from end of string */
export function removeTrailingSlash(path: string) {
  return path.replace(/[/\\]+$/, '');
}

export function createInstallTarget(specifier: string, all = true): InstallTarget {
  return {
    specifier,
    all,
    default: false,
    namespace: false,
    named: [],
  };
}

export function isJavaScript(pathname: string): boolean {
  const ext = path.extname(pathname).toLowerCase();
  return ext === '.js' || ext === '.mjs' || ext === '.cjs';
}

/**
 * Detect the web dependency "type" as either JS or ASSET:
 *   - BUNDLE: Install and bundle this file with Rollup engine.
 *   - ASSET: Copy this file directly.
 */
export function getWebDependencyType(pathname: string): 'ASSET' | 'BUNDLE' | 'DTS' {
  const ext = path.extname(pathname).toLowerCase();
  // JavaScript should always be bundled.
  if (isJavaScript(pathname)) {
    return 'BUNDLE';
  }
  // Svelte & Vue should always be bundled because we want to show the missing plugin
  // error if a Svelte or Vue file is the install target. Without this, the .svelte/.vue
  // file would be treated like an asset and sent to the web as-is.
  if (ext === '.svelte' || ext === '.vue') {
    return 'BUNDLE';
  }

  // TypeScript typings
  if (pathname.endsWith('.d.ts')) {
    return 'DTS';
  }

  // All other files should be treated as assets (copied over directly).
  return 'ASSET';
}
