import fs from 'fs';
import path from 'path';
import {SnowpackConfig} from '../types';
import {
  addExtension,
  findMatchingAliasEntry,
  getExtensionMatch,
  hasExtension,
  isPathImport,
  isRemoteUrl,
  replaceExtension,
} from '../util';
import { fileURLToPath, pathToFileURL } from 'url';
import {getUrlsForFile} from './file-urls';
import fastGlob from 'fast-glob';

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
function resolveSourceSpecifier(
  lazyFileLoc: string,
  {parentFile, config}: {parentFile: string; config: SnowpackConfig},
) {
  const lazyFileStat = getFsStat(lazyFileLoc);

  // Handle directory imports (ex: "./components" -> "./components/index.js")
  if (lazyFileStat && lazyFileStat.isDirectory()) {
    const trailingSlash = lazyFileLoc.endsWith(path.sep) ? '' : path.sep;
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
    // missing extension
    if (getFsStat(lazyFileLoc + path.extname(parentFile))) {
      // first, try parent file’s extension
      lazyFileLoc = lazyFileLoc + path.extname(parentFile);
    } else {
      // otherwise, try and match any extension from the extension map
      for (const [ext, outputExts] of Object.entries(config._extensionMap)) {
        if (!outputExts.includes('.js')) continue; // only look through .js-friendly extensions
        if (getFsStat(lazyFileLoc + ext)) {
          lazyFileLoc = lazyFileLoc + ext;
          break;
        }
      }
    }

    // if still no extension match, fall back to .js
    if (!path.extname(lazyFileLoc)) {
      lazyFileLoc = lazyFileLoc + '.js';
    }
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

  const resolvedUrls = getUrlsForFile(lazyFileLoc, config);
  return resolvedUrls ? resolvedUrls[0] : resolvedUrls;
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
    if (spec[0] === '/') {
      return spec;
    }
    if (isPathImport(spec)) {
      const importedFileLoc = path.resolve(path.dirname(fileLoc), path.normalize(spec));
      return resolveSourceSpecifier(importedFileLoc, {parentFile: fileLoc, config}) || spec;
    }
    const aliasEntry = findMatchingAliasEntry(config, spec);
    if (aliasEntry && (aliasEntry.type === 'path' || aliasEntry.type === 'url')) {
      const {from, to} = aliasEntry;
      let result = spec.replace(from, to);
      if (aliasEntry.type === 'url') {
        return result;
      }
      const importedFileLoc = path.resolve(config.root, result);
      return resolveSourceSpecifier(importedFileLoc, {parentFile: fileLoc, config}) || spec;
    }
    return false;
  };
}

/**
 * Create a import glob resolver function, which converts any import globs relative to the given file at "fileLoc"
 * to a local file. These will additionally be transformed by the regular import resolver, so they do not need
 * to be finalized just yet
 */
export function createImportGlobResolver({fileLoc, config}: {fileLoc: string; config: SnowpackConfig}) {
  return async function importGlobResolver(spec: string): Promise<string[]> {
    if (spec.startsWith('/')) {
      spec = path.join(config.root, pathToFileURL(spec).href);
    }

    const aliasEntry = findMatchingAliasEntry(config, spec);
    if (aliasEntry && (aliasEntry.type === 'path')) {
      const {from, to} = aliasEntry;
      spec = spec.replace(from, to);
      spec = path.resolve(config.root, spec));
    }

    let url = fileURLToPath(spec);

    if (!(url.startsWith('/') || url.startsWith('.'))) {
      throw new Error(`Glob imports must be relative (starting with ".") or absolute (starting with "/", which is treated as relative to project root)`)
    }

    if (spec.startsWith('/')) {
      spec = path.resolve(config.root, spec));
      spec = path.relative(path.dirname(fileLoc), spec);
    }
    const resolved = await fastGlob(spec, { cwd: path.dirname(fileLoc) });
    return resolved.map(spec => {
      if (spec.startsWith('.') || spec.startsWith('/')) return fileURLToPath(spec);
      return `./${fileURLToPath(spec)}`
    });
  };
}
