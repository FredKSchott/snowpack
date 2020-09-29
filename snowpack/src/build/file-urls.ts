import path from 'path';
import {SnowpackConfig} from '../types/snowpack';
import {getExt, replaceExt} from '../util';

export const defaultFileExtensionMapping = {
  '.mjs': '.js',
  '.jsx': '.js',
  '.ts': '.js',
  '.tsx': '.js',
  '.vue': '.js',
  '.svelte': '.js',
  '.mdx': '.js',
  '.svx': '.js',
  '.elm': '.js',
  '.yaml': '.json',
  '.toml': '.json',
  '.php': '.html',
  '.md': '.html',
  '.ejs': '.html',
  '.njk': '.html',
  '.scss': '.css',
  '.sass': '.css',
  '.less': '.css',
};

/**
 * Map a file path to the hosted URL for a given "mount" entry.
 */
export function getUrlForFileMount({
  fileLoc,
  mountKey,
  mountEntry,
  config,
}: {
  fileLoc: string;
  mountKey: string;
  mountEntry: string;
  config: SnowpackConfig;
}): string {
  const {baseExt} = getExt(fileLoc);
  const resolvedDirUrl = mountEntry === '/' ? '' : mountEntry;
  return replaceExt(
    fileLoc.replace(mountKey, resolvedDirUrl).replace(/[/\\]+/g, '/'),
    baseExt,
    config._extensionMap[baseExt] || defaultFileExtensionMapping[baseExt] || baseExt,
  );
}

/**
 * Get the final, hosted URL path for a given file on disk.
 */
export function getUrlForFile(fileLoc: string, config: SnowpackConfig): string | null {
  // PERF: Use `for...in` here instead of the slower `Object.entries()` method
  // that we use everywhere else, since this function can get called 100s of
  // times during a build.
  for (const mountKey in config.mount) {
    if (!config.mount.hasOwnProperty(mountKey)) {
      continue;
    }
    if (!fileLoc.startsWith(mountKey + path.sep)) {
      continue;
    }
    const mountEntry = config.mount[mountKey];
    return getUrlForFileMount({fileLoc, mountKey, mountEntry, config});
  }
  return null;
}
