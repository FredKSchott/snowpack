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

const babel = require('@babel/core');
const IS_FAST_REFRESH_ENABLED = /\$RefreshReg\$\(/;
async function transformJs(contents, id, skipTransform) {
  let fastRefreshEnhancedCode;

  if (skipTransform) {
    fastRefreshEnhancedCode = contents;
  } else if (IS_FAST_REFRESH_ENABLED.test(contents)) {
    // Warn in case someone has a bad setup, and to help older users upgrade.
    console.warn(
      `[@snowpack/plugin-react-refresh] ${id}\n"react-refresh/babel" plugin no longer needed in your babel config, safe to remove.`,
    );
    fastRefreshEnhancedCode = contents;
  } else {
    const {code} = await babel.transformAsync(contents, {
      cwd: process.cwd(),
      filename: id,
      ast: false,
      compact: false,
      sourceMaps: false,
      configFile: false,
      babelrc: false,
      plugins: [require('react-refresh/babel')],
    });
    fastRefreshEnhancedCode = code;
  }

  // If fast refresh markup wasn't added, just return the original content.
  if (!fastRefreshEnhancedCode || !IS_FAST_REFRESH_ENABLED.test(fastRefreshEnhancedCode)) {
    return contents;
  }

  return `
/** React Refresh: Setup **/
if (import.meta.hot) {
  if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
    console.warn('@snowpack/plugin-react-refresh: HTML setup script not run. React Fast Refresh only works when Snowpack serves your HTML routes. You many want to remove this plugin.');
  } else {
    var prevRefreshReg = window.$RefreshReg$;
    var prevRefreshSig = window.$RefreshSig$;
    window.$RefreshReg$ = (type, id) => {
      window.$RefreshRuntime$.register(type, ${JSON.stringify(id)} + " " + id);
    }
    window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
  }
}

${fastRefreshEnhancedCode}

/** React Refresh: Connect **/
if (import.meta.hot) {
  window.$RefreshReg$ = prevRefreshReg
  window.$RefreshSig$ = prevRefreshSig
  import.meta.hot.accept(() => {
    window.$RefreshRuntime$.performReactRefresh()
  });
}`;
}

module.exports = function reactRefreshTransform(snowpackConfig, {babel}) {
  return {
    name: '@snowpack/plugin-react-refresh',
    transform({contents, fileExt, id, isDev}) {
      // Use long-form "=== false" to handle older Snowpack versions
      if (snowpackConfig.devOptions.hmr === false) {
        return;
      }
      if (!isDev) {
        return;
      }
      if (fileExt === '.js') {
        const skipTransform = babel === false;
        return transformJs(contents, id, skipTransform);
      }
      if (fileExt === '.html') {
        return transformHtml(contents);
      }
    },
  };
};
