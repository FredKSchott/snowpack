import {Plugin} from 'rollup';

/**
 * rollup-plugin-remote-resolve
 *
 * Rewrites imports for "remote packages" to point to the remote URL instead.
 * This shouldn't ever run by default, but must be activated via config.
 */
export function rollupPluginRemoteResolve({
  remoteUrl,
  remotePackages,
}: {
  remoteUrl: string;
  remotePackages: [string, string][];
}): Plugin {
  const remotePackageMap = new Map(remotePackages);
  return {
    name: 'snowpack:peer-dependency-resolver',
    resolveId(source) {
      if (remotePackageMap.has(source)) {
        let urlSourcePath = source;
        // NOTE(@fks): This is really Pika CDN specific, but no one else should be using this option.
        if (source === 'react' || source === 'react-dom') {
          urlSourcePath = '_/' + source;
        }
        return {
          id: `${remoteUrl}/${urlSourcePath}/${remotePackageMap.get(source)}`,
          external: true,
          isExternal: true,
        };
      }
      return null;
    },
  };
}
