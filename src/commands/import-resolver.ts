import {Stats, statSync} from 'fs';
import path from 'path';
import {SnowpackConfig} from '../config';
import {findMatchingMountScript} from '../util';
import srcFileExtensionMapping from './src-file-extension-mapping';
const cwd = process.cwd();
const URL_HAS_PROTOCOL_REGEX = /^\w:\/\./;

interface ImportResolverOptions {
  fileLoc: string;
  dependencyImportMap: any | null;
  isDev: boolean;
  isBundled: boolean;
  config: SnowpackConfig;
}

/** Perform a file disk lookup for the requested import specifier. */
export function getImportStats(dirLoc: string, spec: string): Stats | false {
  const importedFileOnDisk = path.resolve(dirLoc, spec);
  try {
    return statSync(importedFileOnDisk);
  } catch (err) {
    // file doesn't exist, that's fine
  }
  return false;
}

/** Resolve an import based on the state of the file/folder found on disk. */
function resolveSourceSpecifier(spec: string, stats: Stats | false, isBundled: boolean) {
  if (stats && stats.isDirectory()) {
    spec = spec + '/index.js';
  } else if (!stats && !spec.endsWith('.js')) {
    spec = spec + '.js';
  }
  const ext = path.extname(spec).substr(1);
  const extToReplace = srcFileExtensionMapping[ext];
  if (extToReplace) {
    spec = spec.replace(new RegExp(`${ext}$`), extToReplace);
  }
  if (!isBundled && (extToReplace || ext) !== 'js') {
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
  dependencyImportMap,
  isDev,
  isBundled,
  config,
}: ImportResolverOptions) {
  const webModulesScript = config.scripts.find((script) => script.id === 'mount:web_modules');
  const webModulesLoc = webModulesScript ? webModulesScript.args.toUrl : '/web_modules';

  return function importResolver(spec: string): string | false {
    if (URL_HAS_PROTOCOL_REGEX.test(spec)) {
      return spec;
    }
    let mountScript = findMatchingMountScript(config.scripts, spec);
    if (mountScript) {
      let {fromDisk, toUrl} = mountScript.args;
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
      let resolvedImport = isDev
        ? path.posix.resolve(webModulesLoc, dependencyImportMap.imports[spec])
        : path.posix.join(
            config.buildOptions.baseUrl,
            webModulesLoc,
            dependencyImportMap.imports[spec],
          );
      const extName = path.extname(resolvedImport);
      if (!isBundled && extName && extName !== '.js') {
        resolvedImport = resolvedImport + '.proxy.js';
      }
      return resolvedImport;
    }
    return false;
  };
}
