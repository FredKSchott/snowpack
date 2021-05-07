const svelte = require('svelte/compiler');
const svelteRollupPlugin = require('rollup-plugin-svelte');
const fs = require('fs');
const path = require('path');
const {createMakeHot} = require('svelte-hmr');

const inlineSourcemap = (code, map) =>
  code +
  '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' +
  new Buffer(map.toString()).toString('base64');

module.exports = function plugin(snowpackConfig, pluginOptions = {}) {
  const isDev = snowpackConfig.mode !== 'production';
  const useSourceMaps =
    snowpackConfig.buildOptions.sourcemap || snowpackConfig.buildOptions.sourceMaps;
  // Old Snowpack versions wouldn't build dependencies. Starting in v3.1, Snowpack's build pipeline
  // is run on all files, including npm package files. The rollup plugin is no longer needed.
  const importedByMap = new Map();
  const needsRollupPlugin = typeof snowpackConfig.buildOptions.resolveProxyImports === 'undefined';

  // Support importing Svelte files when you install dependencies.
  const packageOptions = snowpackConfig.packageOptions || snowpackConfig.installOptions;
  if (packageOptions.source === 'local') {
    if (needsRollupPlugin) {
      packageOptions.rollup = packageOptions.rollup || {};
      packageOptions.rollup.plugins = packageOptions.rollup.plugins || [];
      packageOptions.rollup.plugins.push(
        svelteRollupPlugin({
          include: /\.svelte$/,
          compilerOptions: {dev: isDev},
          // Snowpack wraps JS-imported CSS in a JS wrapper, so use
          // Svelte's own first-class `emitCss: false` here.
          // TODO: Remove once Snowpack adds first-class CSS import support in deps.
          emitCss: false,
        }),
      );
    }
    // Support importing sharable Svelte components.
    packageOptions.packageLookupFields.push('svelte');
  }

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
    throw new Error(`[plugin-svelte] Option "input" must be an array (e.g. ['.svelte', '.svx'])`);
  }
  if (pluginOptions.input && pluginOptions.input.length === 0) {
    throw new Error(`[plugin-svelte] Option "input" must specify at least one filetype`);
  }
  let configFilePath = path.resolve(
    snowpackConfig.root || process.cwd(),
    pluginOptions.configFilePath || 'svelte.config.js',
  );
  let compilerOptions = pluginOptions.compilerOptions;
  let preprocessOptions = pluginOptions.preprocess;
  let resolveInputOption = pluginOptions.input;
  const hmrOptions = pluginOptions.hmrOptions;

  if (fs.existsSync(configFilePath)) {
    const configFileConfig = require(configFilePath);
    preprocessOptions =
      preprocessOptions !== undefined ? preprocessOptions : configFileConfig.preprocess;
    compilerOptions =
      compilerOptions !== undefined ? compilerOptions : configFileConfig.compilerOptions;
    resolveInputOption =
      resolveInputOption !== undefined ? resolveInputOption : configFileConfig.extensions;
  } else {
    //user svelte.config.js is optional and should not error if not configured
    if (pluginOptions.configFilePath) {
      throw new Error(`[plugin-svelte] failed to find Svelte config file: "${configFilePath}"`);
    }
  }

  if (preprocessOptions === undefined) {
    preprocessOptions = require('svelte-preprocess')();
  }

  function addImportsToMap(filePath, imp) {
    const importedBy = importedByMap.get(imp);
    if (importedBy) {
      importedBy.add(filePath);
    } else {
      importedByMap.set(imp, new Set([filePath]));
    }
  }

  let makeHot = (...args) => {
    makeHot = createMakeHot({
      walk: svelte.walk,
      absoluteImports: false,
      versionNonAbsoluteImports: packageOptions.source === 'remote',
    });
    return makeHot(...args);
  };

  return {
    name: '@snowpack/plugin-svelte',
    resolve: {
      input: resolveInputOption || ['.svelte'],
      output: ['.js', '.css'],
    },
    knownEntrypoints: [
      'svelte/internal',
      'svelte-hmr/runtime/hot-api-esm.js',
      'svelte-hmr/runtime/proxy-adapter-dom.js',
    ],

    /**
     * If any files imported the given file path, mark them as changed.
     * @private
     */
    _markImportersAsChanged(filePath) {
      if (importedByMap.has(filePath)) {
        const importedBy = importedByMap.get(filePath);
        importedByMap.delete(filePath);
        for (const importerFilePath of importedBy) {
          this.markChanged(importerFilePath);
        }
      }
    },

    /**
     * When a file changes, also mark it's importers as changed.
     * svelte.preprocess returns a list of preprocess deps - https://svelte.dev/docs#svelte_preprocess
     */
    onChange({filePath}) {
      this._markImportersAsChanged(filePath);
    },

    async load({filePath, isHmrEnabled, isSSR, isPackage}) {
      let dependencies = [];
      let codeToCompile = await fs.promises.readFile(filePath, 'utf-8');
      // PRE-PROCESS
      if (preprocessOptions !== false) {
        ({code: codeToCompile, dependencies} = await svelte.preprocess(
          codeToCompile,
          preprocessOptions,
          {
            filename: filePath,
          },
        ));
      }

      // in dev mode, track preprocess dependencies
      if (isDev && dependencies && dependencies.length) {
        dependencies.forEach((imp) => addImportsToMap(filePath, imp));
      }

      const finalCompileOptions = {
        generate: isSSR ? 'ssr' : 'dom',
        css: isPackage ? true : false,
        ...compilerOptions, // Note(drew) should take precedence over generate above
        dev: isHmrEnabled || isDev,
        outputFilename: filePath,
        filename: filePath,
      };

      const compiled = svelte.compile(codeToCompile, finalCompileOptions);
      const {js, css} = compiled;

      if (useSourceMaps) {
        js.code = inlineSourcemap(js.code, js.map);
      }

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
            preserveLocalState: true,
            injectCss: true,
            ...hmrOptions,
            absoluteImports: false,
            noOverlay: true,
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
