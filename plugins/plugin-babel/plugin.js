const workerpool = require('workerpool');
let worker, pool;

function wrapEnvDefine(code) {
  if (!code.includes('process.env')) {
    return code;
  }
  return `var process = {env: import.meta.env};\n${code}`
}

module.exports = function plugin(snowpackConfig, options = {}) {
  // options validation
  if (options) {
    if (typeof options !== 'object') throw new Error(`options isn’t an object. Please see README.`);
    if (options.input && !Array.isArray(options.input))
      throw new Error(
        `options.input must be an array (e.g. ['.js', '.mjs', '.jsx', '.ts', '.tsx'])`,
      );
    if (options.input && !options.input.length)
      throw new Error(`options.input must specify at least one filetype`);
  }

  return {
    name: '@snowpack/plugin-babel',
    resolve: {
      input: options.input || ['.js', '.mjs', '.jsx', '.ts', '.tsx'],
      output: ['.js'], // always export JS
    },
    async load({filePath}) {
      if (!filePath) {
        return;
      }
      pool = pool || workerpool.pool(require.resolve('./worker.js'));
      worker = worker || (await pool.proxy());
      let encodedResult = await worker.transformFileAsync(filePath, {
        cwd: process.cwd(),
        ast: false,
        compact: false,
        sourceMaps: snowpackConfig.buildOptions.sourceMaps,
        ...(options.transformOptions || {}),
      });
      let {code, map} = JSON.parse(encodedResult);

      if (code) {
        code = wrapEnvDefine(code);
      }
      return {
        '.js': {
          code,
          map,
        },
      };
    },
    cleanup() {
      pool && pool.terminate();
    },
  };
};
