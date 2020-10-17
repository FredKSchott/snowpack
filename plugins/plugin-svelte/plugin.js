const svelte = require('svelte/compiler');
const svelteRollupPlugin = require('rollup-plugin-svelte');
const fs = require('fs');
const path = require('path');
const {createMakeHot} = require('svelte-hmr');
const cwd = process.cwd();

let makeHot = (...args) => {
  makeHot = createMakeHot({walk: svelte.walk});
  return makeHot(...args);
};

module.exports = function plugin(snowpackConfig, pluginOptions = {}) {
  const isDev = process.env.NODE_ENV !== 'production';
  const useSourceMaps = snowpackConfig.buildOptions.sourceMaps;

  // Support importing Svelte files when you install dependencies.
  snowpackConfig.installOptions.rollup.plugins.push(
    svelteRollupPlugin({include: '**/node_modules/**', dev: isDev}),
  );

  if (
    pluginOptions.generate !== undefined ||
    pluginOptions.dev !== undefined ||
    pluginOptions.hydratable !== undefined ||
    pluginOptions.css !== undefined ||
    pluginOptions.preserveComments !== undefined ||
    pluginOptions.preserveWhitespace !== undefined ||
    pluginOptions.sveltePath !== undefined
  ) {
    throw new Error(
      `[plugin-svelte] Svelte.compile options moved to new config value: {compilerOptions: {...}}`,
    );
  }

  if (pluginOptions.compileOptions !== undefined) {
    throw new Error(
      `[plugin-svelte] Could not recognize "compileOptions". Did you mean "compilerOptions"?`,
    );
  }
  if (pluginOptions.input && !Array.isArray(pluginOptions.input)) {
    throw new Error(
      `[plugin-svelte] Option "input" must be an array (e.g. ['.svelte', '.svx'])`,
    );
  }
  if (pluginOptions.input && pluginOptions.input.length === 0) {
    throw new Error(`[plugin-svelte] Option "input" must specify at least one filetype`);
  }

  let configFilePath = path.resolve(cwd, pluginOptions.configFilePath || 'svelte.config.js');
  let compilerOptions = pluginOptions.compilerOptions;
  let preprocessOptions = pluginOptions.preprocess;
  let resolveInputOption = pluginOptions.input || ['.svelte'];
  const hmrOptions = pluginOptions.hmrOptions;

  if (fs.existsSync(configFilePath)) {
    const configFileConfig = require(configFilePath);
    preprocessOptions = preprocessOptions || configFileConfig.preprocess;
    compilerOptions = compilerOptions || configFileConfig.compilerOptions;
  } else {
    //user svelte.config.js is optional and should not error if not configured
    if (pluginOptions.configFilePath) {
      throw new Error(`[plugin-svelte] failed to find Svelte config file: "${configFilePath}"`);
    }
  }

  return {
    name: '@snowpack/plugin-svelte',
    resolve: {
      input: resolveInputOption,
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

      const finalCompileOptions = {
        generate: isSSR ? 'ssr' : 'dom',
        css: false,
        ...compilerOptions, // Note(drew) should take precedence over generate above
        dev: isDev,
        outputFilename: filePath,
        filename: filePath,
      };

      const compiled = svelte.compile(codeToCompile, finalCompileOptions);
      const {js, css} = compiled;
      const output = {
        '.js': {
          code: js.code,
          map: useSourceMaps ? js.map : undefined,
        },
      };

      if (isHmrEnabled && !isSSR) {
        output['.js'].code = makeHot({
          id: filePath,
          compiledCode: js.code,
          hotOptions: {
            ...hmrOptions,
            absoluteImports: false,
            injectCss: true,
          },
          compiled,
          originalCode: codeToCompile,
          compileOptions: finalCompileOptions,
        });
      }

      if (!finalCompileOptions.css && css && css.code) {
        output['.css'] = {
          code: css.code,
          map: useSourceMaps ? css.map : undefined,
        };
      }
      return output;
    },
  };
};
