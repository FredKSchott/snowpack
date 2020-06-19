import path from 'path';
import {SnowpackConfig} from '../config';
import {findMatchingMountScript} from '../util';
import {isDirectoryImport} from './build-util';
import srcFileExtensionMapping from './src-file-extension-mapping';

const URL_HAS_PROTOCOL_REGEX = /^\w:\/\./;

interface ImportResolverOptions {
  fileLoc: string;
  dependencyImportMap: any;
  isBuild: boolean;
  isBundled: boolean;
  config: SnowpackConfig;
}

/**
 * Create a import resolver function, which converts any import relative to the given file at "fileLoc"
 * to a proper URL. Returns false if no matching import was found, which usually indicates a package
 * not found in the import map.
 */
export function createImportResolver({
  fileLoc,
  dependencyImportMap,
  isBuild,
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
      spec = spec.replace(fromDisk, toUrl);
    }
    if (spec.startsWith('/') || spec.startsWith('./') || spec.startsWith('../')) {
      const ext = path.extname(spec).substr(1);
      if (!ext) {
        if (isDirectoryImport(fileLoc, spec)) {
          return spec + '/index.js';
        } else {
          return spec + '.js';
        }
      }
      const extToReplace = srcFileExtensionMapping[ext];
      if (extToReplace) {
        spec = spec.replace(new RegExp(`${ext}$`), extToReplace);
      }
      if (!isBundled && (extToReplace || ext) !== 'js') {
        spec = spec + '.proxy.js';
      }
      return spec;
    }
    if (dependencyImportMap.imports[spec]) {
      let resolvedImport = isBuild
        ? path.posix.join(
            config.buildOptions.baseUrl,
            webModulesLoc,
            dependencyImportMap.imports[spec],
          )
        : path.posix.resolve(webModulesLoc, dependencyImportMap.imports[spec]);
      const extName = path.extname(resolvedImport);
      if (!isBundled && extName && extName !== '.js') {
        resolvedImport = resolvedImport + '.proxy.js';
      }
      return resolvedImport;
    }
    return false;
  };
}
