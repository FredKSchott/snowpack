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
  {
    const exports = {};
    ${reactRefreshCode}
    exports.performReactRefresh = debounce(exports.performReactRefresh, 30);
    window.$RefreshRuntime$ = exports;
    window.$RefreshRuntime$.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
  }
</script>`,
  );
}

const babel = require('@babel/core');
const IS_FAST_REFRESH_ENABLED = /\$RefreshReg\$\(/;
async function transformJs(
  contents,
  id,
  cwd,
  skipTransform,
  inputSourceMap,
  sourceMaps,
  reactRefreshOptions,
) {
  if (skipTransform) {
    return contents;
  } else if (IS_FAST_REFRESH_ENABLED.test(contents)) {
    // Warn in case someone has a bad setup, and to help older users upgrade.
    console.warn(
      `[@snowpack/plugin-react-refresh] ${id}\n"react-refresh/babel" plugin no longer needed in your babel config, safe to remove.`,
    );
    return contents;
  } else {
    const {code, map} = await babel.transformAsync(contents, {
      cwd,
      filename: id,
      ast: false,
      compact: false,
      sourceMaps,
      inputSourceMap: sourceMaps && inputSourceMap ? JSON.parse(inputSourceMap) : undefined,
      configFile: false,
      babelrc: false,
      plugins: [
        [require('react-refresh/babel'), reactRefreshOptions],
        require('@babel/plugin-syntax-class-properties'),
      ],
    });

    if (IS_FAST_REFRESH_ENABLED.test(code)) {
      return babel
        .transformAsync(code, {
          cwd: process.cwd(),
          filename: id,
          ast: false,
          compact: false,
          sourceMaps,
          inputSourceMap: (sourceMaps && map) || undefined,
          configFile: false,
          babelrc: false,
          plugins: [[require('./hmr-babel-plugin'), {id}]],
        })
        .then((result) => {
          if (result.map) {
            return {contents: result.code, map: result.map};
          }
          return result.code;
        });
    } else {
      if (map) {
        return {contents: code, map};
      }

      return code;
    }
  }
}

module.exports = function reactRefreshTransform(snowpackConfig, {babel, reactRefreshOptions}) {
  return {
    name: '@snowpack/plugin-react-refresh',
    transform({contents, fileExt, id, isDev, inputSourceMap}) {
      // Use long-form "=== false" to handle older Snowpack versions
      if (snowpackConfig.devOptions.hmr === false) {
        return;
      }
      if (!isDev) {
        return;
      }
      if (fileExt === '.js') {
        const skipTransform = babel === false;
        const sourceMaps =
          snowpackConfig.buildOptions && snowpackConfig.buildOptions.sourceMaps ? true : false;
        return transformJs(
          contents,
          id,
          snowpackConfig.root || process.cwd(),
          skipTransform,
          inputSourceMap,
          sourceMaps,
          reactRefreshOptions,
        );
      }
      if (fileExt === '.html') {
        return transformHtml(contents);
      }
    },
  };
};
