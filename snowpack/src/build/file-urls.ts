import path from 'path';
import {MountEntry, SnowpackConfig} from '../types/snowpack';
import {replaceExt, getExtensionMatch} from '../util';

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
  const fileExt = path.extname(fileLoc);
  const fileName = path.basename(fileLoc);
  const resolvedDirUrl = mountEntry.url === '/' ? '' : mountEntry.url;
  return replaceExt(
    fileLoc.replace(mountKey, resolvedDirUrl).replace(/[/\\]+/g, '/'),
    fileExt,
    mountEntry.static ? fileExt : getExtensionMatch(fileName, config._extensionMap) || fileExt,
  );
}

/**
 * Get the final, hosted URL path for a given file on disk.
 */
export function getMountEntryForFile(
  fileLoc: string,
  config: SnowpackConfig,
): [string, MountEntry] | null {
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
