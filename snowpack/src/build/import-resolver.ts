import fs from 'fs';
import path from 'path';
import {SnowpackConfig} from '../types/snowpack';
import {findMatchingAliasEntry, getExt, isRemoteSpecifier, replaceExt} from '../util';
import {getUrlForFile} from './file-urls';

const cwd = process.cwd();

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
export function createImportResolver({fileLoc, config}: {fileLoc: string; config: SnowpackConfig}) {
  return function importResolver(spec: string): string | false {
    // Ignore "http://*" imports
    if (isRemoteSpecifier(spec)) {
      return spec;
    }
    // Ignore packages marked as external
    if (config.installOptions.externalPackage?.includes(spec)) {
      return spec;
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
    if (aliasEntry && (aliasEntry.type === 'path' || aliasEntry.type === 'url')) {
      const {from, to} = aliasEntry;
      let result = spec.replace(from, to);
      if (aliasEntry.type === 'url') {
        return result;
      }
      const importedFileLoc = path.resolve(cwd, result);
      const importStats = getImportStats(importedFileLoc);
      const newSpec = getUrlForFile(importedFileLoc, config) || spec;
      return resolveSourceSpecifier(newSpec, importStats, config);
    }
    return false;
  };
}
