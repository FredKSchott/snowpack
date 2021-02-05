import path from 'path';
import type * as esbuild from 'esbuild';
import generateProcessPolyfill from './generateProcessPolyfill';

const FETCH_POLYFILL = `
// native patch for: node-fetch, whatwg-fetch
// ref: https://github.com/tc39/proposal-global
var getGlobal = function () {
  if (typeof self !== 'undefined') { return self; }
  if (typeof window !== 'undefined') { return window; }
  if (typeof global !== 'undefined') { return global; }
  throw new Error('unable to locate global object');
}
var global = getGlobal();
export default global.fetch.bind(global);
export const Headers = global.Headers;
export const Request = global.Request;
export const Response = global.Response;
`;

/**
 * rollup-plugin-catch-fetch
 *
 * How it works: NPM packages will sometimes contain Node.js-specific polyfills
 * for the native browser Fetch API. Since this makes no sense in an ESM web
 * project, we can replace these expensive polyfills with native references to
 * the fetch API.
 *
 * This still allows you to polyfill fetch in older browsers, if you desire.
 */
function isNodeFetch(id: string): boolean {
  return (
    id === 'node-fetch' ||
    id === 'whatwg-fetch' ||
    id.includes(path.join('node_modules', 'node-fetch')) || // note: sometimes Snowpack has found the entry file already
    id.includes(path.join('node_modules', 'whatwg-fetch'))
  );
}

export function esbuildPluginPolyfill(env: any, cwd: string) {
  return {
    name: 'esinstall:polyfill',
    setup(build: esbuild.PluginBuild) {
      build.onResolve({filter: /.*/}, ({path: id, importer}) => {
        console.log('ID', id, importer);

        if (id.endsWith('process-polyfill.js')) {
          return {
            path: 'process',
            namespace: 'esinstall:polyfill',
          };

        }
        if (isNodeFetch(id)) {
          return {
            path: 'fetch',
            namespace: 'esinstall:polyfill',
          };
        }
      });
      // build.onLoad({filter: /process/, namespace: 'esinstall:polyfill'}, () => {
      //   return {
      //     loader: 'js' as esbuild.Loader,
      //     contents: generateProcessPolyfill(env),
      //     resolveDir: cwd,
      //   };
      // });
      build.onLoad({filter: /fetch/, namespace: 'esinstall:polyfill'}, () => {
        return {
          loader: 'js' as esbuild.Loader,
          contents: FETCH_POLYFILL,
          resolveDir: cwd,
        };
      });
    },
  };
}
