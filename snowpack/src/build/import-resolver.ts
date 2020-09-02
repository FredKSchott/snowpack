import fs from 'fs';
import path from 'path';
import {ImportMap, SnowpackConfig} from '../types/snowpack';
import {
  findMatchingAliasEntry,
  getExt,
  relativeURL,
  replaceExt,
  URL_HAS_PROTOCOL_REGEX,
} from '../util';
import srcFileExtensionMapping from './src-file-extension-mapping';

const cwd = process.cwd();

interface ImportResolverOptions {
  fileLoc: string;
  dependencyImportMap: ImportMap | null | undefined;
  config: SnowpackConfig;
}

/** Perform a file disk lookup for the requested import specifier. */
export function getImportStats(dirLoc: string, spec: string): fs.Stats | false {
  const importedFileOnDisk = path.resolve(dirLoc, spec);
  try {
    return fs.statSync(importedFileOnDisk);
  } catch (err) {
    // file doesn't exist, that's fine
  }
  return false;
}

/** Resolve an import based on the state of the file/folder found on disk. */
function resolveSourceSpecifier(spec: string, stats: fs.Stats | false, config: SnowpackConfig) {
  if (stats && stats.isDirectory()) {
    const trailingSlash = spec.endsWith('/') ? '' : '/';
    spec = spec + trailingSlash + 'index.js';
  } else if (!stats && !spec.endsWith('.js') && !spec.endsWith('.css')) {
    spec = spec + '.js';
  }
  const {baseExt} = getExt(spec);
  const extToReplace = config._extensionMap[baseExt] || srcFileExtensionMapping[baseExt];
  if (extToReplace) {
    spec = replaceExt(spec, baseExt, extToReplace);
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
  dependencyImportMap,
  config,
}: ImportResolverOptions) {
  return function importResolver(spec: string): string | false {
    if (URL_HAS_PROTOCOL_REGEX.test(spec)) {
      return spec;
    }
    if (spec.startsWith('/') || spec.startsWith('./') || spec.startsWith('../')) {
      const importStats = getImportStats(path.dirname(fileLoc), spec);
      spec = resolveSourceSpecifier(spec, importStats, config);
      return spec;
    }
    const aliasEntry = findMatchingAliasEntry(config, spec);
    if (aliasEntry && aliasEntry.type === 'path') {
      const {from, to} = aliasEntry;
      let result = spec.replace(from, to);
      const importStats = getImportStats(cwd, result);
      result = resolveSourceSpecifier(result, importStats, config);
      // replace Windows backslashes at the end, after resolution
      result = relativeURL(path.dirname(fileLoc), result);
      return result;
    }
    if (dependencyImportMap) {
      // NOTE: We don't need special handling for an alias here, since the aliased "from"
      // is already the key in the import map. The aliased "to" value is also an entry.
      const importMapEntry = dependencyImportMap.imports[spec];
      if (importMapEntry) {
        return path.posix.resolve(config.buildOptions.webModulesUrl, importMapEntry);
      }
    }
    return false;
  };
}
