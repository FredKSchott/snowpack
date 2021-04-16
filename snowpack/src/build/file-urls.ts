import path from 'path';
import slash from 'slash';
import {MountEntry, SnowpackConfig} from '../types';
import {addExtension, getExtensionMatch, replaceExtension} from '../util';

/**
 * Map a file path to the hosted URL for a given "mount" entry.
 */
export function getUrlsForFileMount({
  fileLoc,
  mountKey,
  mountEntry,
  config,
}: {
  fileLoc: string;
  mountKey: string;
  mountEntry: MountEntry;
  config: SnowpackConfig;
}): string[] {
  const resolvedDirUrl = mountEntry.url === '/' ? '' : mountEntry.url;
  const mountedUrl = fileLoc.replace(mountKey, resolvedDirUrl).replace(/[/\\]+/g, '/');
  if (mountEntry.static) {
    return [mountedUrl];
  }
  return getBuiltFileUrls(mountedUrl, config);
}

/**
 * Map a file path to the hosted URL for a given "mount" entry.
 */
export function getBuiltFileUrls(filepath: string, config: SnowpackConfig): string[] {
  const fileName = path.basename(filepath);
  const extensionMatch = getExtensionMatch(fileName, config._extensionMap);
  if (!extensionMatch) {
    // CSS Modules require a special .json mapping here
    if (filepath.endsWith('.module.css')) {
      return [filepath, filepath + '.json'];
    }

    // Otherwise, return only the requested file
    return [filepath];
  }
  const [inputExt, outputExts] = extensionMatch;
  return outputExts.map((outputExt) => {
    if (outputExts.length > 1) {
      return addExtension(filepath, outputExt);
    } else {
      return replaceExtension(filepath, inputExt, outputExt);
    }
  });
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
export function getUrlsForFile(fileLoc: string, config: SnowpackConfig): undefined | string[] {
  const mountEntryResult = getMountEntryForFile(fileLoc, config);
  if (!mountEntryResult) {
    if (!config.workspaceRoot) {
      return undefined;
    }
    const builtEntrypointUrls = getBuiltFileUrls(fileLoc, config);
    return builtEntrypointUrls.map((u) =>
      path.posix.join(
        config.buildOptions.metaUrlPath,
        'link',
        slash(path.relative(config.workspaceRoot as string, u)),
      ),
    );
  }
  const [mountKey, mountEntry] = mountEntryResult;
  return getUrlsForFileMount({fileLoc, mountKey, mountEntry, config});
}
