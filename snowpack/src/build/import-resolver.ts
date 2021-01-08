import glob from 'glob';
import fs from 'fs';
import path from 'path';
import {SnowpackConfig} from '../types';
import {
  findMatchingAliasEntry,
  getExtensionMatch,
  getExtension,
  isRemoteUrl,
  replaceExtension,
  addBuildExtension,
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
  console.log('resolveSourceSpecifier', lazyFileLoc);

  // Handle directory imports (ex: "./components" -> "./components/index.js")
  if (lazyFileStat && lazyFileStat.isDirectory()) {
    const trailingSlash = lazyFileLoc.endsWith('/') ? '' : '/';
    lazyFileLoc = lazyFileLoc + trailingSlash + 'index';
  }

  let actualFileLoc: string | undefined;
  if (lazyFileStat && lazyFileStat.isFile()) {
    actualFileLoc = lazyFileLoc;
  } else {
    let lazyExt = getExtension(lazyFileLoc);
    if (lazyExt === '.js') {
      const tsWorkaroundImportFileLoc = replaceExtension(lazyFileLoc, '.js', '.ts');
      if (getFsStat(tsWorkaroundImportFileLoc)) {
        lazyFileLoc = tsWorkaroundImportFileLoc;
      }
    } else if (lazyExt === '.jsx') {
      const tsWorkaroundImportFileLoc = replaceExtension(lazyFileLoc, '.jsx', '.tsx');
      if (getFsStat(tsWorkaroundImportFileLoc)) {
        lazyFileLoc = tsWorkaroundImportFileLoc;
      }
    } else if (!lazyExt) {
      const possibleMatches = glob.sync(lazyFileLoc + '*', {nodir: true, absolute: true});
      console.log('possibleMatches', possibleMatches);
      if (possibleMatches.length > 0) {
        lazyFileLoc = possibleMatches[0];
        // TODO: warn if > 1?
      }
    }
  }

  if (!actualFileLoc) {
    // TODO:
    throw new Error(`File does not exist! What do we do?`);
  }

  // Transform the file extension (from input to output)
  const extensionMatch = getExtensionMatch(actualFileLoc, config._extensionMap);
  console.log('extensionMatch', actualFileLoc, 'X', extensionMatch);
  if (extensionMatch) {
    actualFileLoc = addBuildExtension(actualFileLoc, extensionMatch[1]);
  }

  const actualUrl = getUrlForFile(actualFileLoc, config);
  if (!actualUrl) {
    // TODO:
    throw new Error(`URL does not exist! What do we do?`);
  }
  return actualUrl;
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
    // Ignore programatically added proxy imports
    if (spec.endsWith('.proxy.js')) {
      return spec;
    }
    // Ignore packages marked as external
    if (config.installOptions.externalPackage?.includes(spec)) {
      return spec;
    }
    if (spec.startsWith('/')) {
      return spec;
    }
    if (spec.startsWith('./') || spec.startsWith('../')) {
      const importedFileLoc = path.resolve(path.dirname(fileLoc), spec);
      return resolveSourceSpecifier(importedFileLoc, config);
    }
    const aliasEntry = findMatchingAliasEntry(config, spec);
    if (aliasEntry && (aliasEntry.type === 'path' || aliasEntry.type === 'url')) {
      const {from, to} = aliasEntry;
      let result = spec.replace(from, to);
      if (aliasEntry.type === 'url') {
        return result;
      }
      const importedFileLoc = path.resolve(config.root, result);
      return resolveSourceSpecifier(importedFileLoc, config);
    }
    return false;
  };
}
