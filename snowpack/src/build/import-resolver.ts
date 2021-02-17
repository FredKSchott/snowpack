import fs from 'fs';
import path from 'path';
import {SnowpackConfig} from '../types';
import {
  addExtension,
  findMatchingAliasEntry,
  getExtensionMatch,
  hasExtension,
  isRemoteUrl,
  replaceExtension,
} from '../util';
import {getUrlForFile} from './file-urls';

/** Perform a file disk lookup for the requested import specifier. */
export function getFsStat(importedFileOnDisk: string): fs.Stats | false {
  try {
    return fs.statSync(importedFileOnDisk);
  } catch (err) {
    // file doesn't exist, that's fine
  }
  return false;
}

/** Resolve an import based on the state of the file/folder found on disk. */
function resolveSourceSpecifier(lazyFileLoc: string, config: SnowpackConfig) {
  const lazyFileStat = getFsStat(lazyFileLoc);

  // Handle directory imports (ex: "./components" -> "./components/index.js")
  if (lazyFileStat && lazyFileStat.isDirectory()) {
    const trailingSlash = lazyFileLoc.endsWith('/') ? '' : '/';
    lazyFileLoc = lazyFileLoc + trailingSlash + 'index.js';
  } else if (lazyFileStat && lazyFileStat.isFile()) {
    lazyFileLoc = lazyFileLoc;
  } else if (hasExtension(lazyFileLoc, '.css')) {
    lazyFileLoc = lazyFileLoc;
  } else if (hasExtension(lazyFileLoc, '.js')) {
    const tsWorkaroundImportFileLoc = replaceExtension(lazyFileLoc, '.js', '.ts');
    if (getFsStat(tsWorkaroundImportFileLoc)) {
      lazyFileLoc = tsWorkaroundImportFileLoc;
    }
  } else if (hasExtension(lazyFileLoc, '.jsx')) {
    const tsWorkaroundImportFileLoc = replaceExtension(lazyFileLoc, '.jsx', '.tsx');
    if (getFsStat(tsWorkaroundImportFileLoc)) {
      lazyFileLoc = tsWorkaroundImportFileLoc;
    }
  } else {
    lazyFileLoc = lazyFileLoc + '.js';
  }

  // Transform the file extension (from input to output)
  const extensionMatch = getExtensionMatch(lazyFileLoc, config._extensionMap);

  if (extensionMatch) {
    const [inputExt, outputExts] = extensionMatch;
    if (outputExts.length > 1) {
      lazyFileLoc = addExtension(lazyFileLoc, outputExts[0]);
    } else {
      lazyFileLoc = replaceExtension(lazyFileLoc, inputExt, outputExts[0]);
    }
  }

  return getUrlForFile(lazyFileLoc, config);
}

/**
 * Create a import resolver function, which converts any import relative to the given file at "fileLoc"
 * to a proper URL. Returns false if no matching import was found, which usually indicates a package
 * not found in the import map.
 */
export function createImportResolver({fileLoc, config}: {fileLoc: string; config: SnowpackConfig}) {
  return function importResolver(spec: string): string | false {
    // Ignore "http://*" imports
    if (isRemoteUrl(spec)) {
      return spec;
    }
    // Ignore packages marked as external
    if (config.packageOptions.external?.includes(spec)) {
      return spec;
    }
    if (spec.startsWith('/')) {
      return spec;
    }
    if (spec.startsWith('./') || spec.startsWith('../') || spec === '.') {
      const importedFileLoc = path.resolve(path.dirname(fileLoc), spec);
      return resolveSourceSpecifier(importedFileLoc, config) || spec;
    }
    const aliasEntry = findMatchingAliasEntry(config, spec);
    if (aliasEntry && (aliasEntry.type === 'path' || aliasEntry.type === 'url')) {
      const {from, to} = aliasEntry;
      let result = spec.replace(from, to);
      if (aliasEntry.type === 'url') {
        return result;
      }
      const importedFileLoc = path.resolve(config.root, result);
      return resolveSourceSpecifier(importedFileLoc, config) || spec;
    }
    return false;
  };
}
