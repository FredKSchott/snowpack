/**
 * @snowpack/plugin-react-refresh (Fast Refresh)
 * Based on details provided by:
 * - https://github.com/facebook/react/issues/16604#issuecomment-528663101
 * - https://github.com/vitejs/vite-plugin-react (see LICENSE)
 */

const fs = require('fs');

const reactRefreshLoc = require.resolve('react-refresh/cjs/react-refresh-runtime.development.js');
const reactRefreshCode = fs
  .readFileSync(reactRefreshLoc, {encoding: 'utf-8'})
  .replace(`process.env.NODE_ENV`, JSON.stringify('development'));

function transformHtml(contents) {
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
</script>`,
  );
}

function transformJs(contents, filePath) {
  return `
/** React Refresh: Setup **/
if (import.meta.hot) {
  var prevRefreshReg = window.$RefreshReg$;
  var prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, ${JSON.stringify(filePath)} + " " + id);
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

module.exports = function reactRefreshTransform(snowpackConfig) {
  return {
    name: '@snowpack/plugin-react-refresh',
    transform({contents, fileExt, isDev}) {
      // Use long-form "=== false" to handle older Snowpack versions
      if (snowpackConfig.devOptions.hmr === false) {
        return;
      }
      if (!isDev) {
        return;
      }
      if (fileExt === '.js' && /\$RefreshReg\$\(/.test(contents)) {
        return transformJs(contents, filePath);
      }
      if (fileExt === '.html') {
        return transformHtml(contents);
      }
    },
  };
};
