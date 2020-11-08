import fs from 'fs';
import path from 'path';
import url from 'url';
import {ImportMap, SnowpackConfig} from '../types/snowpack';
import {findMatchingAliasEntry, getExt, replaceExt} from '../util';
import {getUrlForFile} from './file-urls';

const cwd = process.cwd();

interface ImportResolverOptions {
  fileLoc: string;
  lockfile?: ImportMap | null;
  installImportMap?: ImportMap | null;
  config: SnowpackConfig;
}

/** Perform a file disk lookup for the requested import specifier. */
export function getImportStats(importedFileOnDisk: string): fs.Stats | false {
  try {
    return fs.statSync(importedFileOnDisk);
  } catch (err) {
    // file doesn't exist, that's fine
  }
  return false;
}

/** Resolve an import based on the state of the file/folder found on disk. */
function resolveSourceSpecifier(spec: string, stats: fs.Stats | false, config: SnowpackConfig) {
  // Handle directory imports (ex: "./components" -> "./components/index.js")
  if (stats && stats.isDirectory()) {
    const trailingSlash = spec.endsWith('/') ? '' : '/';
    spec = spec + trailingSlash + 'index.js';
  }
  // Transform the file extension (from input to output)
  const {baseExt} = getExt(spec);
  const extToReplace = config._extensionMap[baseExt];
  if (extToReplace) {
    spec = replaceExt(spec, baseExt, extToReplace);
  }
  // Lazy check to handle imports that are missing file extensions
  if (!stats && !spec.endsWith('.js') && !spec.endsWith('.css')) {
    spec = spec + '.js';
  }
  return spec;
}

/**
 * Create a import resolver function, which converts any import relative to the given file at "fileLoc"
 * to a proper URL. Returns false if no matching import was found, which usually indicates a package
 * not found in the import map.
 */
export function createImportResolver({
  fileLoc,
  lockfile,
  installImportMap,
  config,
}: ImportResolverOptions) {
  return function importResolver(spec: string): string | false {
    // Ignore "http://*" imports
    if (url.parse(spec).protocol) {
      return spec;
    }
    // Ignore packages marked as external
    if (config.installOptions.externalPackage?.includes(spec)) {
      return spec;
    }
    // Support snowpack.lock.json entry
    if (lockfile && lockfile.imports[spec]) {
      const mappedImport = lockfile.imports[spec];
      if (url.parse(mappedImport).protocol) {
        return mappedImport;
      }
      throw new Error(
        `Not yet supported: "${spec}" lockfile entry must be a full URL (https://...).`,
      );
    }
    if (spec.startsWith('/')) {
      const importStats = getImportStats(path.resolve(cwd, spec.substr(1)));
      return resolveSourceSpecifier(spec, importStats, config);
    }
    if (spec.startsWith('./') || spec.startsWith('../')) {
      const importedFileLoc = path.resolve(path.dirname(fileLoc), spec);
      const importStats = getImportStats(importedFileLoc);
      const newSpec = getUrlForFile(importedFileLoc, config) || spec;
      return resolveSourceSpecifier(newSpec, importStats, config);
    }
    const aliasEntry = findMatchingAliasEntry(config, spec);
    if (aliasEntry && aliasEntry.type === 'path') {
      const {from, to} = aliasEntry;
      let result = spec.replace(from, to);
      const importedFileLoc = path.resolve(cwd, result);
      const importStats = getImportStats(importedFileLoc);
      const newSpec = getUrlForFile(importedFileLoc, config) || spec;
      return resolveSourceSpecifier(newSpec, importStats, config);
    }
    if (installImportMap && installImportMap.imports[spec]) {
      // NOTE: We don't need special handling for an alias here, since the aliased "from"
      // is already the key in the import map. The aliased "to" value is also an entry.
      const importMapEntry = installImportMap.imports[spec];
      return path.posix.resolve(config.buildOptions.webModulesUrl, importMapEntry);
    }
    return false;
  };
}
