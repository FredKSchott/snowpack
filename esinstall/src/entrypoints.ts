import fs from 'fs';
import path from 'path';
import validatePackageName from 'validate-npm-package-name';
import {ExportField, ExportMapEntry, PackageManifestWithExports, PackageManifest} from './types';
import {parsePackageImportSpecifier, resolveDependencyManifest} from './util';
import pm from 'picomatch';

// Rarely, a package will ship a broken "browser" package.json entrypoint.
// Ignore the "browser" entrypoint in those packages.
const BROKEN_BROWSER_ENTRYPOINT = ['@sheerun/mutationobserver-shim'];

function hasTypes(manifest: PackageManifest): boolean {
  return !!(manifest.types || manifest.typings);
}

type FindManifestEntryOptions = {
  packageLookupFields?: string[];
  packageName?: string;
};

/**
 *
 */
export function findManifestEntry(
  manifest: PackageManifest,
  entry?: string,
  {packageLookupFields = [], packageName}: FindManifestEntryOptions = {},
): string | undefined {
  let foundEntrypoint: string | undefined;

  if (manifest.exports) {
    foundEntrypoint =
      typeof manifest.exports === 'string'
        ? manifest.exports
        : findExportMapEntry(manifest.exports['.']);

    if (typeof foundEntrypoint === 'string') {
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

  if (foundEntrypoint) {
    return foundEntrypoint;
  }

  if (!(packageName && BROKEN_BROWSER_ENTRYPOINT.includes(packageName))) {
    // Some packages define "browser" as an object. We'll do our best to find the
    // right entrypoint in an entrypoint object, or fail otherwise.
    // See: https://github.com/defunctzombie/package-browser-field-spec
    let browserField = manifest.browser;

    if (typeof browserField === 'string') {
      return browserField;
    } else if (typeof browserField === 'object') {
      let browserEntrypoint =
        (entry && browserField[entry]) ||
        browserField['./index.js'] ||
        browserField['./index'] ||
        browserField['index.js'] ||
        browserField['index'] ||
        browserField['./'] ||
        browserField['.'];

      if (typeof browserEntrypoint === 'string') {
        return browserEntrypoint;
      }
    }
  }

  // If browser object is set but no relevant entrypoint is found, fall back to "main".
  return manifest.main;
}

/**
 * Given an ExportMapEntry find the entry point, resolving recursively.
 */
export function findExportMapEntry(
  exportMapEntry?: ExportMapEntry,
  conditions?: string[],
): string | undefined {
  // If this is a string or undefined we can skip checking for conditions
  if (typeof exportMapEntry === 'string' || typeof exportMapEntry === 'undefined') {
    return exportMapEntry;
  }

  let entry = exportMapEntry;
  if (conditions) {
    for (let condition of conditions) {
      if (entry[condition]) {
        entry = entry[condition];
      }
    }
  }

  return (
    findExportMapEntry(entry?.browser) ||
    findExportMapEntry(entry?.import) ||
    findExportMapEntry(entry?.default) ||
    findExportMapEntry(entry?.require) ||
    undefined
  );
}

type ResolveEntrypointOptions = {
  cwd: string;
  packageLookupFields: string[];
};

/**
 * Resolve a "webDependencies" input value to the correct absolute file location.
 * Supports both npm package names, and file paths relative to the node_modules directory.
 * Follows logic similar to Node's resolution logic, but using a package.json's ESM "module"
 * field instead of the CJS "main" field.
 */
export function resolveEntrypoint(
  dep: string,
  {cwd, packageLookupFields}: ResolveEntrypointOptions,
): string {
  // We first need to check for an export map in the package.json. If one exists, resolve to it.
  const [packageName, packageEntrypoint] = parsePackageImportSpecifier(dep);
  const [packageManifestLoc, packageManifest] = resolveDependencyManifest(packageName, cwd);

  if (packageManifestLoc && packageManifest && typeof packageManifest.exports !== 'undefined') {
    const exportField = (packageManifest as PackageManifestWithExports).exports;

    // If this is a non-main entry point
    if (packageEntrypoint) {
      const normalizedMap = explodeExportMap(exportField, {
        cwd: path.dirname(packageManifestLoc),
      });
      const mapValue = normalizedMap && Reflect.get(normalizedMap, './' + packageEntrypoint);

      if (typeof mapValue !== 'string') {
        throw new Error(
          `Package "${packageName}" exists but package.json "exports" does not include entry for "./${packageEntrypoint}".`,
        );
      }
      return path.join(packageManifestLoc, '..', mapValue);
    } else {
      const exportMapEntry = exportField['.'];
      const mapValue = findExportMapEntry(exportMapEntry);

      if (mapValue) {
        return path.join(packageManifestLoc, '..', mapValue);
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

  if (!depManifest) {
    try {
      const maybeLoc = fs.realpathSync.native(require.resolve(dep, {paths: [cwd]}));
      return maybeLoc;
    } catch {
      // Oh well, was worth a try
    }
  }

  if (!depManifestLoc || !depManifest) {
    throw new Error(
      `Package "${dep}" not found. Have you installed it? ${depManifestLoc ? depManifestLoc : ''}`,
    );
  }

  let foundEntrypoint = findManifestEntry(depManifest, dep, {
    packageName,
    packageLookupFields,
  });

  // Some packages are types-only. If this is one of those packages, resolve with that.
  if (!foundEntrypoint && hasTypes(depManifest)) {
    const typesLoc = (depManifest.types || depManifest.typings) as string;
    return path.join(depManifestLoc, '..', typesLoc);
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

const picoMatchGlobalOptions = Object.freeze({
  capture: true,
  noglobstar: true,
});

function* forEachExportEntry(
  exportField: ExportField,
): Generator<[string, unknown], any, undefined> {
  const simpleExportMap = findExportMapEntry(exportField);

  // Handle case where export map is a string, or if there‘s only one file in the entire export map
  if (simpleExportMap) {
    yield ['.', simpleExportMap];

    return;
  }

  for (const [key, val] of Object.entries(exportField)) {
    // skip invalid entries
    if (!key.startsWith('.')) {
      continue;
    }

    yield [key, val];
  }
}

function* forEachWildcardEntry(
  key: string,
  value: string,
  cwd: string,
): Generator<[string, string], any, undefined> {
  try {
    let expr = pm.makeRe(value, picoMatchGlobalOptions);
    let reldirnm = path.dirname(value);
    let dirpth = path.join(cwd, reldirnm);
    let files = fs.readdirSync(dirpth);

    for (let file of files) {
      let relfile = path.join(reldirnm, file);
      let match = expr.exec(relfile);

      if (match && match[1]) {
        let [pth, repl] = match;
        let k = key.replace('*', repl);
        yield [k, './' + pth];
      }
    }
  } catch {
    // Should we just pretend this didn't happen?
  }
}

function* forEachExportEntryExploded(
  exportField: ExportField,
  cwd: string,
): Generator<[string, unknown], any, undefined> {
  for (const [key, val] of forEachExportEntry(exportField)) {
    // Deprecated but we still want to support this.
    // https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
    if (key.endsWith('/')) {
      if (typeof val !== 'string') {
        continue;
      }

      // There isn't a clear use-case for this, so we are assuming it's not needed for now.
      if (key === './') {
        continue;
      }

      yield* forEachWildcardEntry(key + '*', val + '*', cwd);

      continue;
    }

    // Wildcards https://nodejs.org/api/packages.html#packages_subpath_patterns
    if (key.includes('*')) {
      if (typeof val !== 'string') {
        continue;
      }
      yield* forEachWildcardEntry(key, val, cwd);

      continue;
    }

    yield [key, val];
  }
}

/**
 * Given an export map and all of the crazy variations, condense down to a key/value map of string keys to string values.
 */
export function explodeExportMap(
  exportField: ExportField | undefined,
  {cwd}: {cwd: string},
): Record<string, string> | undefined {
  if (!exportField) {
    return;
  }
  const cleanExportMap: Record<string, string> = {};

  for (const [key, val] of forEachExportEntryExploded(exportField, cwd)) {
    // If entry is an array, assume that we can always support the first value
    const firstVal = Array.isArray(val) ? val[0] : val;
    // Support these entries, in this order.
    const cleanValue = findExportMapEntry(firstVal);
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
