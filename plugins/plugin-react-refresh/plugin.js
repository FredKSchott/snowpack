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
const { headerText, footerText } = require('./wrappers');
const IS_FAST_REFRESH_ENABLED = /\$RefreshReg\$\(/;
async function transformJs(contents, id, cwd, skipTransform, sourceMaps) {
  let fastRefreshEnhancedCode;
  let fastRefreshEnhancedMap;

  if (skipTransform) {
    fastRefreshEnhancedCode = `${headerText(id)}\n${contents}\n${footerText()}}`;
  } else if (IS_FAST_REFRESH_ENABLED.test(contents)) {
    // Warn in case someone has a bad setup, and to help older users upgrade.
    console.warn(
      `[@snowpack/plugin-react-refresh] ${id}\n"react-refresh/babel" plugin no longer needed in your babel config, safe to remove.`,
    );

    fastRefreshEnhancedCode = `${headerText(id)}\n${contents}\n${footerText()}}`
  } else {
    const {code, map} = await babel.transformAsync(contents, {
      cwd,
      filename: id,
      ast: false,
      compact: false,
      sourceMaps,
      configFile: false,
      babelrc: false,
      plugins: [
        require('react-refresh/babel'),
        require('@babel/plugin-syntax-class-properties'),
        [require('./babel-plugin-wrap'), {
          header: headerText(id),
          footer: footerText()
        }],
      ],
    });
    fastRefreshEnhancedCode = code;
    fastRefreshEnhancedMap = map;
  }

  // If fast refresh markup wasn't added, just return the original content.
  if (!fastRefreshEnhancedCode || !IS_FAST_REFRESH_ENABLED.test(fastRefreshEnhancedCode)) {
    return {
      code: contents,
    };
  }

  return {
    code: fastRefreshEnhancedCode,
    map: fastRefreshEnhancedMap
  };
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
        const sourceMaps = !!snowpackConfig.buildOptions.sourceMaps;
        return transformJs(contents, id, snowpackConfig.root || process.cwd(), skipTransform, sourceMaps);
      }
      if (fileExt === '.html') {
        return transformHtml(contents);
      }
    },
  };
};
