/**
 * @snowpack/plugin-react-refresh (Fast Refresh)
 * Based on details provided by:
 * - https://github.com/facebook/react/issues/16604#issuecomment-528663101
 * - https://github.com/vitejs/vite-plugin-react (see LICENSE)
 */

const fs = require("fs");

const reactRefreshLoc = require.resolve(
  "react-refresh/cjs/react-refresh-runtime.development.js"
);
const reactRefreshCode = fs
  .readFileSync(reactRefreshLoc, { encoding: "utf-8" })
  .replace(`process.env.NODE_ENV`, JSON.stringify("development"));

function transformHtml(contents, urlPath) {
  return contents.replace(
    /<body.*?>/,
    `$&
<script>
  function debounce(e,t){let u;return()=>{clearTimeout(u),u=setTimeout(e,t)}}
  const exports = {};
  ${reactRefreshCode}
  exports.performReactRefresh = debounce(exports.performReactRefresh, 30);
  window.$RefreshRuntime$ = exports;
  window.$RefreshRuntime$.injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => {};
  window.$RefreshSig$ = () => (type) => type;
</script>`
  );
}

function transformJs(contents, urlPath) {
  return `
/** React Refresh: Setup **/
if (import.meta.hot) {
  var prevRefreshReg = window.$RefreshReg$;
  var prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, ${JSON.stringify(
      urlPath
    )} + " " + id);
  }
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}

${contents}

/** React Refresh: Connect **/
if (import.meta.hot) {
  window.$RefreshReg$ = prevRefreshReg
  window.$RefreshSig$ = prevRefreshSig
  import.meta.hot.accept(() => {
    window.$RefreshRuntime$.performReactRefresh()
  });
}`;
}

module.exports = function reactRefreshTransform(snowpackConfig, pluginOptions) {
  return {
    transform({ contents, urlPath, isDev }) {
      // Use long-form "=== false" to handle older Snowpack versions
      if (snowpackConfig.devOptions.hmr === false) {
        return null;
      }
      if (!isDev) {
        return null;
      }
      if (urlPath.endsWith(".js") && /\$RefreshReg\$\(/.test(contents)) {
        return { result: transformJs(contents, urlPath) };
      }
      if (urlPath.endsWith("/") || urlPath.endsWith(".html")) {
        return { result: transformHtml(contents, urlPath) };
      }
    },
  };
};
