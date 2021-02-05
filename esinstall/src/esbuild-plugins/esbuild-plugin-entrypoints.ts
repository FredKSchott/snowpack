import path from 'path';
import type * as esbuild from 'esbuild';
import {isPackageAliasEntry, getWebDependencyType} from '../util';
import {resolveEntrypoint} from '../entrypoints';
import escapeStringRegExp from 'escape-string-regexp';

type DependencyLoc = {
  type: 'BUNDLE' | 'ASSET' | 'DTS';
  loc: string;
};

/**
 * Resolve a "webDependencies" input value to the correct absolute file location.
 * Supports both npm package names, and file paths relative to the node_modules directory.
 * Follows logic similar to Node's resolution logic, but using a package.json's ESM "module"
 * field instead of the CJS "main" field.
 */
function resolveWebDependency(
  dep: string,
  resolveOptions: {cwd: string; packageLookupFields: string[]},
): DependencyLoc {
  const loc = resolveEntrypoint(dep, resolveOptions);

  return {
    loc,
    type: getWebDependencyType(loc),
  };
}

export function esbuildPluginEntrypoints(
  installEntrypoints: {[targetName: string]: string} = {},
  virtualEntrypoints: {[targetName: string]: string},
  installAlias: Record<string, string>,
  cwd: string,
) {
  const installAliasEntries = [
    // Apply all aliases
    ...Object.entries(installAlias)
      .filter(([, val]) => isPackageAliasEntry(val))
      .map(([key, val]) => ({
        find: key,
        replacement: val,
        exact: false,
      })),
    // Make sure that internal imports also honor any resolved installEntrypoints
    ...Object.entries(installEntrypoints).map(([key, val]) => ({
      find: key,
      replacement: val,
      exact: true,
    })),
  ];

  return {
    name: 'esinstall',
    setup(build: esbuild.PluginBuild) {
      // Handle non-JS files as external
      // build.onResolve({filter: /\.(js|cjs|mjs|json)$/}, ({path: id, importer}) => {
      //   if (importer && (id.startsWith('./') || id.startsWith('../'))) {
      //     return {
      //       path: path.posix.resolve(importer, id),
      //       external: true,
      //     };
      //   }
      // });

      build.onResolve({filter: /.*/}, ({path: id, importer, resolveDir}) => {
        console.log('ID3', id);

        function getAliasReplacement({find, replacement, exact}) {
          if (id.startsWith(find) && !exact) {
            return id.replace(find, replacement);
          }
          if (id === find && exact) {
            return replacement;
          }
        }
        console.error(
          1,
          importer,
          !!importer,
          2,
          id,
          3,
          installEntrypoints,
        );
        if (!importer) {
          return {
            path: id,
            namespace: 'esinstall'
          };
        }
        const installAliasMatch = installAliasEntries.find(getAliasReplacement);
        if (installAliasMatch) {
          id = getAliasReplacement(installAliasMatch);
        }
        if (installEntrypoints[id]) {
          return {
            path: id,
          };
        }
        console.log('IDD', id, resolveDir);
        if (id.startsWith('/') || id.startsWith('./') || id.startsWith('../')) {
          return installAliasMatch ? {path: id} : {path: path.resolve(resolveDir, id)};
        }
        const resolvedResult = resolveWebDependency(id, {
          cwd,
          packageLookupFields: [],
        });
        if (resolvedResult) {
          return {path: resolvedResult.loc, external: resolvedResult.type !== 'BUNDLE'};
        }
      });

      build.onLoad(
      {filter: /.*/, namespace: 'esinstall'},
        ({path: id}) => {
          let originalId = id;
          if (!installEntrypoints[originalId]) {
            originalId = originalId.replace(/\.js$/, '');
          }
          console.error(originalId, installEntrypoints)
          // let loader = path.extname(originalId).substr(1);
          // if (loader !== 'js' && loader !== 'json') {
          //   loader = 'js';
          // }
          // console.error(path.dirname(installEntrypoints[originalId]));
          return {
            loader: 'js',
            contents: virtualEntrypoints[originalId],
            resolveDir: cwd,
          };
        },
      );
    },
  } as esbuild.Plugin;
}
