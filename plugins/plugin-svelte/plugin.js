const fs = require('fs');
const path = require('path');
const svelte = require('svelte/compiler');
const svelteRollupPlugin = require('rollup-plugin-svelte');
const execa = require('execa');
const npmRunPath = require('npm-run-path');
const cwd = process.cwd();

module.exports = function plugin(snowpackConfig, pluginOptions = {}) {
  const isDev = process.env.NODE_ENV !== 'production';

  // Support importing Svelte files when you install dependencies.
  snowpackConfig.installOptions.rollup.plugins.push(
    svelteRollupPlugin({include: '**/node_modules/**', dev: isDev}),
  );

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
    dev: isDev,
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
    async load({filePath, isSSR}) {
      let codeToCompile = fs.readFileSync(filePath, 'utf-8');
      // PRE-PROCESS
      if (preprocessOptions) {
        codeToCompile = (
          await svelte.preprocess(codeToCompile, preprocessOptions, {
            filename: filePath,
          })
        ).code;
      }

      const {js, css} = svelte.compile(codeToCompile, {
        ...svelteOptions,
        generate: isSSR ? 'ssr' : 'dom',
        outputFilename: filePath,
        filename: filePath,
      });

      const {sourceMaps} = snowpackConfig.buildOptions;
      const output = {
        '.js': {
          code: js.code,
          map: sourceMaps ? js.map : undefined,
        },
      };
      if (!svelteOptions.css && css && css.code) {
        output['.css'] = {
          code: css.code,
          map: sourceMaps ? css.map : undefined,
        };
      }
      return output;
    },
    async run({isDev, log}) {
      const workerPromise = execa.command(`svelte-check --output human ${isDev ? '--watch' : ''}`, {
        env: {FORCE_COLOR: true, ...npmRunPath.env()},
        extendEnv: true,
        windowsHide: false,
        cwd,
      });
      const {stdout, stderr} = workerPromise;
      let isDone = false;
      function dataListener(chunk) {
        let stdOutput = chunk.toString();
        if (isDev && isDone) {
          log('WORKER_RESET', {});
        }
        isDone = stdOutput.includes('svelte-check found');
        log('WORKER_MSG', {level: 'log', msg: stdOutput});
      }
      stdout && stdout.on('data', dataListener);
      stderr && stderr.on('data', dataListener);
      return workerPromise;
    },
  };
};
