import path from 'path';
import {SnowpackConfig} from '../types/snowpack';
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

  const pluginResolveMultiple: string[] = [];
  let inputExt, outputExt;
  for (const ext of getExt(filePath)) {
    for (const plugin of config.plugins) {
      if (!plugin.resolve) continue;
      const pluginInput = plugin.resolve.input;
      const pluginOutput = plugin.resolve.output;
      if (!pluginInput.includes(ext)) continue;
      if (pluginInput.length > 1) {
        pluginResolveMultiple.push(`input (${pluginInput.join(', ')})`);
      }
      if (pluginOutput.length > 1) {
        pluginResolveMultiple.push(`output (${pluginOutput.join(', ')})`);
      }
      if (pluginResolveMultiple.length) {
        logger.debug(`Can't use plugin ${plugin.name} to resolve ${filePath}: Multiple extensions for ${pluginResolveMultiple.join(' and ')}`);
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
  // optimization: 99% of the time, extensions are the same
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
  mountEntry: string;
  config: SnowpackConfig;
}): string {
  const resolvedDirUrl = mountEntry === '/' ? '' : mountEntry;
  return tryPluginsResolveExt(
    config,
    fileLoc.replace(mountKey, resolvedDirUrl).replace(/[/\\]+/g, '/'),
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
