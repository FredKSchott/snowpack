import {Plugin} from 'rollup';

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
export function rollupPluginCatchFetch(): Plugin {
  return {
    name: 'snowpack:fetch-handler',
    resolveId(id) {
      if (id !== 'node-fetch' && id !== 'whatwg-fetch') {
        return null;
      }
      return id;
    },
    load(id) {
      if (id !== 'node-fetch' && id !== 'whatwg-fetch') {
        return null;
      }
      return FETCH_POLYFILL;
    },
  };
}
