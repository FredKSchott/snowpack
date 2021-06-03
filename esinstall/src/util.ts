import {promises as fs, realpathSync} from 'fs';
import path from 'path';
import validatePackageName from 'validate-npm-package-name';
import {InstallTarget, ImportMap, PackageManifest} from './types';
import resolve from 'resolve';

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
  return /\w+\:\/\//.test(val) || val.startsWith('//');
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
  try {
    // resolve doesn't care about export map rules, so should find a package.json
    // if one does exist.
    const pkgPth = resolve.sync(`${dep}/package.json`, {
      basedir: cwd,
    });

    const depManifest = realpathSync.native(pkgPth);
    return [depManifest, NATIVE_REQUIRE(depManifest)];
  } catch {
    // This shouldn't ever happen if the package does exist.
    return [null, null];
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
const bundleTypeExtensions = new Set(['.svelte', '.vue', '.astro']);

export function getWebDependencyType(pathname: string): 'ASSET' | 'BUNDLE' | 'DTS' {
  const ext = path.extname(pathname).toLowerCase();
  // JavaScript should always be bundled.
  if (isJavaScript(pathname)) {
    return 'BUNDLE';
  }
  // Svelte & Vue (& Astro) should always be bundled because we want to show the missing plugin
  // error if a Svelte or Vue or Astro file is the install target. Without this, the .svelte/.vue
  // file would be treated like an asset and sent to the web as-is.
  if (bundleTypeExtensions.has(ext)) {
    return 'BUNDLE';
  }

  // TypeScript typings
  if (pathname.endsWith('.d.ts')) {
    return 'DTS';
  }

  // All other files should be treated as assets (copied over directly).
  return 'ASSET';
}
