import fs from 'fs';
import path from 'path';
import {SnowpackConfig} from '../config';
import {findMatchingMountScript, getExt, ImportMap, replaceExt} from '../util';
import srcFileExtensionMapping from './src-file-extension-mapping';

const cwd = process.cwd();
const URL_HAS_PROTOCOL_REGEX = /^(\w+:)?\/\//;

interface ImportResolverOptions {
  fileLoc: string;
  webModulesPath: string;
  dependencyImportMap: ImportMap | null | undefined;
  isDev: boolean;
  isBundled: boolean;
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
function resolveSourceSpecifier(spec: string, stats: fs.Stats | false, isBundled: boolean) {
  if (stats && stats.isDirectory()) {
    const trailingSlash = spec.endsWith('/') ? '' : '/';
    spec = spec + trailingSlash + 'index.js';
  } else if (!stats && !spec.endsWith('.js') && !spec.endsWith('.css')) {
    spec = spec + '.js';
  }
  const {baseExt} = getExt(spec);
  const extToReplace = srcFileExtensionMapping[baseExt];
  if (extToReplace) {
    spec = replaceExt(spec, extToReplace);
  }
  if (!isBundled && (extToReplace || baseExt) !== '.js') {
    spec = spec + '.proxy.js';
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
  webModulesPath,
  dependencyImportMap,
  isDev,
  isBundled,
  config,
}: ImportResolverOptions) {
  return function importResolver(spec: string): string | false {
    if (URL_HAS_PROTOCOL_REGEX.test(spec)) {
      return spec;
    }
    let mountScript = findMatchingMountScript(config._mountedDirs, spec);
    if (mountScript) {
      const [fromDisk, toUrl] = mountScript;
      const importStats = getImportStats(cwd, spec);
      spec = resolveSourceSpecifier(spec, importStats, isBundled);
      spec = spec.replace(fromDisk, toUrl);
      return spec;
    }
    if (spec.startsWith('/') || spec.startsWith('./') || spec.startsWith('../')) {
      const importStats = getImportStats(path.dirname(fileLoc), spec);
      spec = resolveSourceSpecifier(spec, importStats, isBundled);
      return spec;
    }
    if (dependencyImportMap && dependencyImportMap.imports[spec]) {
      // if baseURL is remote, handle that outside of path.posix.join()
      const protocolMatch = config.buildOptions.baseUrl.match(URL_HAS_PROTOCOL_REGEX);
      const protocol = (protocolMatch && protocolMatch[0]) || '';
      const baseUrl = config.buildOptions.baseUrl.replace(URL_HAS_PROTOCOL_REGEX, '');

      let resolvedImport = isDev
        ? path.posix.resolve(webModulesPath, dependencyImportMap.imports[spec])
        : `${protocol}${path.posix.join(
            baseUrl,
            webModulesPath,
            dependencyImportMap.imports[spec],
          )}`;
      const extName = path.extname(resolvedImport);
      if (!isBundled && extName && extName !== '.js') {
        resolvedImport = resolvedImport + '.proxy.js';
      }
      return resolvedImport;
    }
    return false;
  };
}
