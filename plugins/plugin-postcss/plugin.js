'use strict';

const {resolve} = require('path');
const workerpool = require('workerpool');

module.exports = function postcssPlugin(snowpackConfig, options) {
  // options validation
  if (options) {
    if (typeof options !== 'object') throw new Error('options isn’t an object. Please see README.');
    if (options.config && typeof options.config !== 'string')
      throw new Error('options.config must be a path to a PostCSS config file.');
  }

  let worker, pool;

  return {
    name: '@snowpack/postcss-transform',
    async transform({fileExt, contents}) {
      let {input = ['.css'], config} = options;

      if (!input.includes(fileExt) || !contents) return;

      if (config) {
        config = resolve(config);
      }

      pool = pool || workerpool.pool(require.resolve('./worker.js'));
      worker = worker || (await pool.proxy());

      const encodedResult = await worker.transformAsync(contents, {
        config,
        cwd: snowpackConfig.root || process.cwd(),
        map:
          snowpackConfig.buildOptions && snowpackConfig.buildOptions.sourceMaps
            ? {
                prev: false,
                annotation: false,
                inline: false,
              }
            : false,
      });
      const {code, map} = JSON.parse(encodedResult);

      return {
        '.css': {code, map},
      };
    },
    cleanup() {
      pool && pool.terminate();
    },
  };
};
