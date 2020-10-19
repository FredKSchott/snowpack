import path from 'path';
import {MountEntry, SnowpackConfig} from '../types/snowpack';
import {logger} from '../logger';
import {getExt, getLastExt, replaceExt} from '../util';

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

export function tryPluginsResolveExt(config: SnowpackConfig, filePath: string) {

  let inputExt, outputExt;
  for (const ext of getExt(filePath)) {
    for (const plugin of config.plugins) {
      if (
        !plugin.resolve ||
        !plugin.resolve.input.includes(ext)
      ) continue;
      const pluginOutput = plugin.resolve.output;
      if (pluginOutput.length < 1) {
        logger.error(`Plugin ${plugin.name} has no extensions for output`);
        continue;
      }
      if (pluginOutput.length > 1) {
        logger.warn(`Can't use plugin ${plugin.name} to resolve ${filePath}: Multiple extensions for output (${pluginOutput.join(', ')})`);
        continue;
      }
      inputExt = ext;
      outputExt = pluginOutput[0];
      break;
    }
    if (inputExt) break;
  }
  if (!inputExt) {
    inputExt = getLastExt(filePath);
    outputExt = config._extensionMap[inputExt] || defaultFileExtensionMapping[inputExt] || inputExt;
  }

  // optimization: most of the time, extensions are the same
  return inputExt === outputExt ? filePath : replaceExt(
    filePath,
    inputExt,
    outputExt,
  );
}

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
  mountEntry: MountEntry;
  config: SnowpackConfig;
}): string {
  const resolvedDirUrl = mountEntry.url === '/' ? '' : mountEntry.url;
  return fileLoc.replace(mountKey, resolvedDirUrl).replace(/[/\\]+/g, '/');
}

/**
 * Get the final, hosted URL path for a given file on disk.
 */
export function getMountEntryForFile(fileLoc: string, config: SnowpackConfig): [string, MountEntry] | null {
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
    return [mountKey, config.mount[mountKey]];
  }
  return null;
}


/**
 * Get the final, hosted URL path for a given file on disk.
 */
export function getUrlForFile(fileLoc: string, config: SnowpackConfig): string | null {
  const mountEntryResult = getMountEntryForFile(fileLoc, config);
  if (!mountEntryResult) {
    return null;
  }
  const [mountKey, mountEntry] = mountEntryResult;
  return getUrlForFileMount({fileLoc, mountKey, mountEntry, config});
}
