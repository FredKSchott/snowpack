const svelte = require('svelte/compiler');
const svelteRollupPlugin = require('rollup-plugin-svelte');
const fs = require('fs');
const path = require('path');
const {createMakeHot} = require('svelte-hmr');

let makeHot = (...args) => {
  makeHot = createMakeHot({walk: svelte.walk});
  return makeHot(...args)
}

module.exports = function plugin(snowpackConfig, {hot: hotOptions, ...sveltePluginOptions} = {}) {
  const isDev = process.env.NODE_ENV !== 'production';

  // Support importing Svelte files when you install dependencies.
  snowpackConfig.installOptions.rollup.plugins.push(
    svelteRollupPlugin({include: '**/node_modules/**', dev: isDev}),
  );

  let svelteOptions;
  let preprocessOptions;
  // Note(drew): __config is for internal testing use; maybe we should make this public at some point?
  const userSvelteConfigLoc =
    sveltePluginOptions.__config || path.join(process.cwd(), 'svelte.config.js');
  if (fs.existsSync(userSvelteConfigLoc)) {
    const userSvelteConfig = require(userSvelteConfigLoc);
    const {preprocess, ..._svelteOptions} = userSvelteConfig;
    preprocessOptions = preprocess;
    svelteOptions = _svelteOptions;
  }
  // Generate svelte options from user provided config (if given)
  svelteOptions = {
    dev: isDev,
    css: false,
    ...svelteOptions,
    ...sveltePluginOptions,
  };

  return {
    name: '@snowpack/plugin-svelte',
    resolve: {
      input: ['.svelte'],
      output: ['.js', '.css'],
    },
    knownEntrypoints: [
      'svelte/internal',
      'svelte-hmr/runtime/hot-api-esm.js',
      'svelte-hmr/runtime/proxy-adapter-dom.js',
    ],
    async load({filePath, isHmrEnabled, isSSR}) {
      let codeToCompile = await fs.promises.readFile(filePath, 'utf-8');
      // PRE-PROCESS
      if (preprocessOptions) {
        codeToCompile = (
          await svelte.preprocess(codeToCompile, preprocessOptions, {
            filename: filePath,
          })
        ).code;
      }

      const compileOptions = {
        generate: isSSR ? 'ssr' : 'dom',
        ...svelteOptions, // Note(drew) should take precedence over generate above
        outputFilename: filePath,
        filename: filePath,
      };

      const compiled = svelte.compile(codeToCompile, compileOptions);

      const {js, css} = compiled;

      const {sourceMaps} = snowpackConfig.buildOptions;
      const output = {
        '.js': {
          code: js.code,
          map: sourceMaps ? js.map : undefined,
        },
      };

      if (isHmrEnabled && !isSSR) {
        output['.js'].code = makeHot({
          id: filePath,
          compiledCode: compiled.js.code,
          hotOptions: {
            ...hotOptions,
            absoluteImports: false,
            injectCss: true,
          },
          compiled,
          originalCode: codeToCompile,
          compileOptions,
        });
      }

      if (!svelteOptions.css && css && css.code) {
        output['.css'] = {
          code: css.code,
          map: sourceMaps ? css.map : undefined,
        };
      }
      return output;
    },
  };
};
