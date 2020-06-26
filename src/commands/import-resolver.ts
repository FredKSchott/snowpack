import fs from 'fs';
import path from 'path';
import {SnowpackConfig, SnowpackPlugin} from '../config';
import {getExt, findMatchingMountScript, ImportMap, replaceExt} from '../util';

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

const srcFileExtensionMapping = {
  '.ejs': '.html',
  '.elm': '.js',
  '.jsx': '.js',
  '.less': '.css',
  '.md': '.html',
  '.mdx': '.js',
  '.mjs': '.js',
  '.njk': '.html',
  '.php': '.html',
  '.sass': '.css',
  '.scss': '.css',
  '.svelte': '.js',
  '.svx': '.js',
  '.toml': '.json',
  '.ts': '.js',
  '.tsx': '.js',
  '.vue': '.js',
  '.yaml': '.json',
};

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
    spec = spec.replace(new RegExp(`\\${baseExt}$`), extToReplace);
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
    let mountScript = findMatchingMountScript(config.__mountedDirs, spec);
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

export interface ExtensionMap {
  input: Record<string, string[]>;
  output: Record<string, string[]>;
}

/** map plugin inputs & outputs to make lookups easier */
export function mapPluginExtensions(plugins: SnowpackPlugin[]): ExtensionMap {
  const extMap: ExtensionMap = {input: {}, output: {}};
  plugins.forEach((plugin) => {
    const inputs = Array.isArray(plugin.input) ? plugin.input : [plugin.input];
    const outputs = Array.isArray(plugin.output) ? plugin.output : [plugin.output];

    // given a file input ('.svelte'), what will the output extensions be? (['.js', '.css'])
    inputs.forEach((ext) => {
      if (!extMap.input[ext]) extMap.input[ext] = [];
      extMap.input[ext] = [...new Set([...extMap.input[ext], ...outputs])]; // only keep unique extensions
    });

    // given a file output ('.css'), what could the input extension be? (['.css', '.scss', '.svelte'])
    outputs.forEach((ext) => {
      if (!extMap.output[ext]) extMap.output[ext] = [ext]; // an output must always possibly come from itself (not true for inputs)
      extMap.output[ext] = [...new Set([...extMap.output[ext], ...inputs])];
    });
  });

  return extMap;
}

/** given an absolute URL, which file on disk does this point to? */
export function urlToFile(
  url: string,
  {
    config,
    dependencyImportMap = {imports: {}},
  }: {config: SnowpackConfig; dependencyImportMap: ImportMap},
): {locOnDisk: string | undefined; lookups: string[]} {
  let locOnDisk: string | undefined;
  const lookups: string[] = [];

  // 1. try and resolve from dependencyImportMap
  if (dependencyImportMap) {
    const matchedDep = Object.keys(dependencyImportMap.imports).find((dep) => url.startsWith(dep));
    if (matchedDep) {
      try {
        locOnDisk = require.resolve(matchedDep);
      } catch (err) {
        // do nothing
      }
    }
  }

  // 2. otherwise, try to resolve from mounted directories (trying multiple extensions)
  if (!locOnDisk) {
    const matchedDir = Object.entries(config.__mountedDirs).find(([, toUrl]) =>
      url.startsWith(toUrl),
    );
    if (matchedDir) {
      const {baseExt, expandedExt} = getExt(url);
      const pluginExtMap = mapPluginExtensions(config.plugins);
      for (const ext of pluginExtMap.output[expandedExt || baseExt]) {
        const attemptedLoc = path.resolve(cwd, replaceExt(url, ext));
        lookups.push(attemptedLoc);
        if (fs.existsSync(attemptedLoc)) {
          locOnDisk = attemptedLoc;
          break;
        }
      }
    }
  }

  return {locOnDisk, lookups};
}

/** given a source file, what are all the URLs it might generate? */
export function fileToURLs(filePath: string, {config}: {config: SnowpackConfig}): string[] {
  const pluginExtMap = mapPluginExtensions(config.plugins);

  // generate array of possible URLs from the input array
  const urls: string[] = [];
  const dirs = Object.entries(config.__mountedDirs).filter(([fromDisk]) =>
    filePath.startsWith(path.resolve(cwd, fromDisk)),
  );
  const {baseExt, expandedExt} = getExt(filePath);
  for (const [, toUrl] of dirs) {
    for (const ext of pluginExtMap.input[expandedExt || baseExt]) {
      const newURL = path.join(toUrl, replaceExt(filePath, ext));
      urls.push(newURL);
    }
  }
  return urls;
}
