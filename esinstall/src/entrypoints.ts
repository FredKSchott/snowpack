import fs from 'fs';
import path from 'path';
import validatePackageName from 'validate-npm-package-name';
import {
  ExportMap,
  ExportMapEntry,
  PackageManifestWithExports,
  PackageManifest,
} from './types';
import {
  parsePackageImportSpecifier,
  resolveDependencyManifest
} from './util';

// Rarely, a package will ship a broken "browser" package.json entrypoint.
// Ignore the "browser" entrypoint in those packages.
const BROKEN_BROWSER_ENTRYPOINT = ['@sheerun/mutationobserver-shim'];

function hasBrokenBrowserEntrypoint(packageName?) {
  return !!(packageName && BROKEN_BROWSER_ENTRYPOINT.includes(packageName));
}

function manifestHasTypes(manifest: PackageManifest): boolean {
  return !!(manifest.types || manifest.typings);
}

type ResolveManifestEntryOptions = {
  packageLookupFields?: string[];
  packageName?: string;
}

function resolveManifestEntry(manifest: PackageManifest, entry?: string, {
  packageLookupFields = [],
  packageName
}: ResolveManifestEntryOptions = {}): string | undefined {
  let foundEntrypoint: string | undefined;

  if(manifest.exports) {
    foundEntrypoint = typeof manifest.exports === 'string' ?
      manifest.exports :
      resolveExportMapEntry(manifest.exports['.']);

    if(typeof foundEntrypoint === 'string') {
      return foundEntrypoint;
    }
  }

  foundEntrypoint = [
    ...packageLookupFields,
    'browser:module',
    'module',
    'main:esnext',
    'jsnext:main',
  ]
    .map((e) => manifest[e])
    .find(Boolean);

  if (!foundEntrypoint && !hasBrokenBrowserEntrypoint(packageName)) {
    // Some packages define "browser" as an object. We'll do our best to find the
    // right entrypoint in an entrypoint object, or fail otherwise.
    // See: https://github.com/defunctzombie/package-browser-field-spec
    let browserField = manifest.browser;

    if(typeof browserField === 'string') {
      foundEntrypoint = browserField;
    } else if (typeof browserField === 'object') {
      let browserEntrypoint =
        (entry && browserField[entry]) ||
        browserField['./index.js'] ||
        browserField['./index'] ||
        browserField['index.js'] ||
        browserField['index'] ||
        browserField['./'] ||
        browserField['.'];

      if(typeof browserEntrypoint === 'string') {
        foundEntrypoint = browserEntrypoint;
      }
    }
  }

  // If browser object is set but no relevant entrypoint is found, fall back to "main".
  if (!foundEntrypoint) {
    foundEntrypoint = manifest.main;
  }

  return foundEntrypoint;
}

export function resolveMainEntrypoint(manifest: PackageManifest) {
  return resolveManifestEntry(manifest);
}

/**
 * Given an ExportMapEntry find the entry point, resolving recursively.
 */
export function resolveExportMapEntry(exportMapEntry?: ExportMapEntry): string | undefined {
  // If this is a string or undefined we can skip checking for conditions
  switch (typeof exportMapEntry) {
    case 'string':
      return exportMapEntry;
    case 'undefined':
      return exportMapEntry;
  }

  return (
    resolveExportMapEntry(exportMapEntry?.browser) ||
    resolveExportMapEntry(exportMapEntry?.import) ||
    resolveExportMapEntry(exportMapEntry?.default) ||
    resolveExportMapEntry(exportMapEntry?.require) ||
    undefined
  );
}

function resolveExportsMap(
  packageManifest: PackageManifestWithExports,
  exportsProp: string,
): string | undefined {
  const exportMapEntry = packageManifest.exports[exportsProp];
  return resolveExportMapEntry(exportMapEntry);
}

type ResolveManifestFn = (dep: string, cwd: string) => [string | null, any];

type ResolveEntrypointOptions = {
  cwd: string;
  packageLookupFields: string[];
  resolveManifest?: ResolveManifestFn | undefined
};

/**
 * Resolve a "webDependencies" input value to the correct absolute file location.
 * Supports both npm package names, and file paths relative to the node_modules directory.
 * Follows logic similar to Node's resolution logic, but using a package.json's ESM "module"
 * field instead of the CJS "main" field.
 */
export function resolveEntrypoint(
  dep: string,
  {
    cwd,
    packageLookupFields,
  }: ResolveEntrypointOptions,
): string {
  // We first need to check for an export map in the package.json. If one exists, resolve to it.
  const [packageName, packageEntrypoint] = parsePackageImportSpecifier(dep);
  const [packageManifestLoc, packageManifest] = resolveDependencyManifest(packageName, cwd);

  if (packageManifestLoc && packageManifest && typeof packageManifest.exports !== 'undefined') {
    // If this is a non-main entry point
    if (packageEntrypoint) {
      const exportMapValue = resolveExportsMap(packageManifest as PackageManifestWithExports, './' + packageEntrypoint);

      if (typeof exportMapValue !== 'string') {
        throw new Error(
          `Package "${packageName}" exists but package.json "exports" does not include entry for "./${packageEntrypoint}".`,
        );
      }
      return path.join(packageManifestLoc, '..', exportMapValue);
    } else {
      const exportMapValue = resolveExportsMap(packageManifest as PackageManifestWithExports, '.');

      if (exportMapValue) {
        return path.join(packageManifestLoc, '..', exportMapValue);
      }
    }
  }

  // if, no export map and dep points directly to a file within a package, return that reference.
  if (path.extname(dep) && !validatePackageName(dep).validForNewPackages) {
    return fs.realpathSync.native(require.resolve(dep, {paths: [cwd]}));
  }

  // Otherwise, resolve directly to the dep specifier. Note that this supports both
  // "package-name" & "package-name/some/path" where "package-name/some/path/package.json"
  // exists at that lower path, that must be used to resolve. In that case, export
  // maps should not be supported.
  const [depManifestLoc, depManifest] = resolveDependencyManifest(dep, cwd);

  if (!depManifestLoc || !depManifest) {
    throw new Error(
      `Package "${dep}" not found. Have you installed it? ${depManifestLoc ? depManifestLoc : ''}`,
    );
  }
  if (
    depManifest.name &&
    (depManifest.name.startsWith('@reactesm') || depManifest.name.startsWith('@pika/react'))
  ) {
    throw new Error(
      `React workaround packages no longer needed! Revert back to the official React & React-DOM packages.`,
    );
  }
  let plf = packageLookupFields;
  let foundEntrypoint = resolveManifestEntry(depManifest, dep, {
    packageName,
    packageLookupFields
  })

  // Some packages are types-only. If this is one of those packages, resolve with that.
  if (!foundEntrypoint && manifestHasTypes(depManifest)) {
    const typesLoc = (depManifest.types || depManifest.typings) as string;
    return path.join(depManifestLoc, '..', typesLoc)
  }
  // Sometimes packages don't give an entrypoint, assuming you'll fall back to "index.js".
  if (!foundEntrypoint) {
    foundEntrypoint = 'index.js';
  }
  if (typeof foundEntrypoint !== 'string') {
    throw new Error(`"${dep}" has unexpected entrypoint: ${JSON.stringify(foundEntrypoint)}.`);
  }

  return fs.realpathSync.native(
    require.resolve(path.join(depManifestLoc || '', '..', foundEntrypoint)),
  );
}

/**
 * Given an export map and all of the crazy variations, condense down to a key/value map of string keys to string values.
 */
export function normalizeExportMap(exportMap?: ExportMap): Record<string, string> | undefined {
  if (!exportMap) {
    return;
  }
  const cleanExportMap: Record<string, string> = {};

  const simpleExportMap = resolveExportMapEntry(exportMap); // handle case where export map is a string, or if there‘s only one file in the entire export map
  if (simpleExportMap) {
    return {'.': simpleExportMap} as Record<string, string>;
  }

  for (const [key, val] of Object.entries(exportMap)) {
    // skip invalid entries
    if (!key.startsWith('.')) {
      continue;
    }
    // skip wildcards for now (https://nodejs.org/api/packages.html#packages_subpath_folder_mappings)
    if (key.endsWith('/') || key.includes('*')) {
      continue;
    }

    // If entry is an array, assume that we can always support the first value
    const firstVal = Array.isArray(val) ? val[0] : val;
    // Support these entries, in this order.
    const cleanValue = resolveExportMapEntry(firstVal);
    if (typeof cleanValue !== 'string') {
      continue;
    }
    cleanExportMap[key] = cleanValue;
  }

  if (Object.keys(cleanExportMap).length === 0) {
    return;
  }
  return cleanExportMap;
}