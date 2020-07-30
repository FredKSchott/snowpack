const svelte = require('svelte/compiler');
const svelteRollupPlugin = require('rollup-plugin-svelte');
const fs = require('fs');
const path = require('path');

module.exports = function plugin(config, pluginOptions) {
  // Support importing Svelte files when you install dependencies.
  config.installOptions.rollup.plugins.push(svelteRollupPlugin({include: '**/node_modules/**'}));

  let svelteOptions;
  let preprocessOptions;
  const userSvelteConfigLoc = path.join(process.cwd(), 'svelte.config.js');
  if (fs.existsSync(userSvelteConfigLoc)) {
    const userSvelteConfig = require(userSvelteConfigLoc);
    const {preprocess, ..._svelteOptions} = userSvelteConfig;
    preprocessOptions = preprocess;
    svelteOptions = _svelteOptions;
  }
  // Generate svelte options from user provided config (if given)
  svelteOptions = {
    dev: process.env.NODE_ENV !== 'production',
    css: false,
    ...svelteOptions,
    ...pluginOptions,
  };

  return {
    name: '@snowpack/plugin-svelte',
    resolve: {
      input: ['.svelte'],
      output: ['.js', '.css'],
    },
    knownEntrypoints: ['svelte/internal'],
    async load({filePath}) {
      let codeToCompile = fs.readFileSync(filePath, 'utf-8');
      // PRE-PROCESS
      if (preprocessOptions) {
        codeToCompile = (
          await svelte.preprocess(codeToCompile, preprocessOptions, {
            filename: filePath,
          })
        ).code;
      }
      // COMPILE
      const {js, css} = svelte.compile(codeToCompile, {
        ...svelteOptions,
        filename: filePath,
      });
      const output = {
        '.js': js && js.code,
      };
      if (!svelteOptions.css && css) {
        output['.css'] = css.code;
      }
      return output;
    },
  };
};
