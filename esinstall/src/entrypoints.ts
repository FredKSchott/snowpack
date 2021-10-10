import {readdirSync, existsSync, realpathSync, statSync} from 'fs';
import path from 'path';
import builtinModules from 'builtin-modules';
import validatePackageName from 'validate-npm-package-name';
import {ExportField, ExportMapEntry, PackageManifestWithExports, PackageManifest} from './types';
import {parsePackageImportSpecifier, resolveDependencyManifest} from './util';
import resolve from 'resolve';
import picomatch from 'picomatch';

export const MAIN_FIELDS = [
  'browser:module',
  'module',
  'browser',
  'main:esnext',
  'jsnext:main',
  'main',
];

// Rarely, a package will ship a broken "browser" package.json entrypoint.
// Ignore the "browser" entrypoint in those packages.
const BROKEN_BROWSER_ENTRYPOINT = ['@sheerun/mutationobserver-shim'];
const FILE_EXTENSION_REGEX = /\..+$/;

function getMissingEntrypointHint(
  packageEntrypoint: string,
  normalizedMap: Record<string, string>,
): string | undefined {
  const noExtensionEntrypoint = './' + packageEntrypoint.replace(FILE_EXTENSION_REGEX, '');
  if (Reflect.get(normalizedMap, noExtensionEntrypoint)) {
    return `Did you mean "${noExtensionEntrypoint}"?`;
  }
  const jsExtensionEntrypoint = './' + packageEntrypoint.replace(FILE_EXTENSION_REGEX, '.js');
  if (Reflect.get(normalizedMap, jsExtensionEntrypoint)) {
    return `Did you mean "${jsExtensionEntrypoint}"?`;
  }
  const cjsExtensionEntrypoint = './' + packageEntrypoint.replace(FILE_EXTENSION_REGEX, '.cjs');
  if (Reflect.get(normalizedMap, cjsExtensionEntrypoint)) {
    return `Did you mean "${cjsExtensionEntrypoint}"?`;
  }
  const mjsExtensionEntrypoint = './' + packageEntrypoint.replace(FILE_EXTENSION_REGEX, '.cjs');
  if (Reflect.get(normalizedMap, mjsExtensionEntrypoint)) {
    return `Did you mean "${mjsExtensionEntrypoint}"?`;
  }
  const directoryEntrypoint = './' + packageEntrypoint + '/index.js';
  if (Reflect.get(normalizedMap, directoryEntrypoint)) {
    return `Did you mean "${directoryEntrypoint}"?`;
  }
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
        : findExportMapEntry(manifest.exports['.'] || manifest.exports);

    if (typeof foundEntrypoint === 'string') {
      return foundEntrypoint;
    }
  }

  foundEntrypoint = [...packageLookupFields, ...MAIN_FIELDS].map((e) => manifest[e]).find(Boolean);

  if (foundEntrypoint && typeof foundEntrypoint === 'string') {
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
        let helpfulHint =
          normalizedMap && getMissingEntrypointHint(packageEntrypoint, normalizedMap);
        throw new Error(
          `Package "${packageName}" exists but package.json "exports" does not include entry for "./${packageEntrypoint}".` +
            (helpfulHint ? `\n${helpfulHint}` : ''),
        );
      }
      return path.join(packageManifestLoc, '..', mapValue);
    } else {
      const exportMapEntry = exportField['.'] || exportField;
      const mapValue = findExportMapEntry(exportMapEntry);

      if (mapValue) {
        return path.join(packageManifestLoc, '..', mapValue);
      }
    }
  }

  // if, no export map and dep points directly to a file within a package, return that reference.
  if (builtinModules.indexOf(dep) === -1 && !validatePackageName(dep).validForNewPackages) {
    return realpathSync.native(
      resolve.sync(dep, {basedir: cwd, extensions: ['.js', '.mjs', '.ts', '.jsx', '.tsx']}),
    );
  }

  // Otherwise, resolve directly to the dep specifier. Note that this supports both
  // "package-name" & "package-name/some/path" where "package-name/some/path/package.json"
  // exists at that lower path, that must be used to resolve. In that case, export
  // maps should not be supported.
  const [depManifestLoc, depManifest] = resolveDependencyManifest(dep, cwd);

  if (!depManifest) {
    try {
      const maybeLoc = realpathSync.native(resolve.sync(dep, {basedir: cwd}));
      return maybeLoc;
    } catch {
      // Oh well, was worth a try
    }
  }

  if (!depManifestLoc || !depManifest) {
    if (path.extname(dep) === '.css') {
      const parts = dep.split('/');
      let npmName = parts.shift();
      if (npmName && npmName.startsWith('@')) npmName += '/' + parts.shift();
      throw new Error(
        `Module "${dep}" not found.
    If you‘re trying to import a CSS file from your project, try "./${dep}".
    If you‘re trying to import an NPM package, try running \`npm install ${npmName}\` and re-running Snowpack.`,
      );
    }
    throw new Error(
      `Package "${dep}" not found. Have you installed it? ${depManifestLoc ? depManifestLoc : ''}`,
    );
  }

  let foundEntrypoint = findManifestEntry(depManifest, dep, {
    packageName,
    packageLookupFields,
  });

  // Sometimes packages don't give an entrypoint, assuming you'll fall back to "index.js".
  if (!foundEntrypoint) {
    for (let possibleEntrypoint of ['index.js', 'index.json']) {
      try {
        return realpathSync.native(
          resolve.sync(path.join(depManifestLoc || '', '..', possibleEntrypoint)),
        );
      } catch {}
    }

    // Couldn't find any entrypoints so throwing
    throw new Error(
      `Unable to find any entrypoint for "${dep}". It could be a typo, or this package might not have a main entrypoint.`,
    );
  }
  if (typeof foundEntrypoint !== 'string') {
    throw new Error(`"${dep}" has unexpected entrypoint: ${JSON.stringify(foundEntrypoint)}.`);
  }

  const finalPath = path.join(depManifestLoc || '', '..', foundEntrypoint);
  try {
    return realpathSync.native(resolve.sync(finalPath));
  } catch {
    throw new Error(`We resolved "${dep}" to ${finalPath}, but the file does not exist on disk.`);
  }
}

const picoMatchGlobalOptions = Object.freeze({
  capture: true,
  noglobstar: true,
});

function* forEachExportEntry(
  exportField: ExportField,
): Generator<[string, ExportMapEntry], any, undefined> {
  const simpleExportMap = findExportMapEntry(exportField);

  // Handle case where export map is a string, or if there‘s only one file in the entire export map
  if (simpleExportMap) {
    yield ['.', simpleExportMap];

    return undefined;
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
  // Creates a regex from a pattern like ./src/extras/*
  let expr = picomatch.makeRe(value, picoMatchGlobalOptions);

  // The directory, ie ./src/extras
  let valueDirectoryName = path.dirname(value);
  let valueDirectoryFullPath = path.join(cwd, valueDirectoryName);

  if (existsSync(valueDirectoryFullPath)) {
    let filesInDirectory = readdirSync(valueDirectoryFullPath).filter(
      (filepath) => statSync(path.join(valueDirectoryFullPath, filepath)).isFile(), // ignore directories
    );

    for (let filename of filesInDirectory) {
      // Create a relative path for this file to match against the regex
      // ex, ./src/extras/one.js
      let relativeFilePath = path.join(valueDirectoryName, filename);
      let match = expr.exec(relativeFilePath);

      if (match && match[1]) {
        let [matchingPath, matchGroup] = match;
        let normalizedKey = key.replace('*', matchGroup);

        // Normalized to posix paths, like ./src/extras/one.js
        let normalizedFilePath =
          '.' + path.posix.sep + matchingPath.split(path.sep).join(path.posix.sep);

        // Yield out a non-wildcard match, for ex.
        // ['./src/extras/one', './src/extras/one.js']

        yield [normalizedKey, normalizedFilePath];
      }
    }
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
      const keyValue = findExportMapEntry(val);

      if (typeof keyValue !== 'string') {
        continue;
      }

      // There isn't a clear use-case for this, so we are assuming it's not needed for now.
      if (key === './') {
        continue;
      }

      yield* forEachWildcardEntry(key + '*', keyValue + '*', cwd);

      continue;
    }

    // Wildcards https://nodejs.org/api/packages.html#packages_subpath_patterns
    if (key.includes('*')) {
      const keyValue = findExportMapEntry(val);

      if (typeof keyValue !== 'string') {
        continue;
      }
      yield* forEachWildcardEntry(key, keyValue, cwd);

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
