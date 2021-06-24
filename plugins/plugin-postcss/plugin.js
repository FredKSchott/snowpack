'use strict';

const path = require('path');
const workerpool = require('workerpool');
const minimatch = require('minimatch');
const normalizePath = require('normalize-path');

module.exports = function postcssPlugin(snowpackConfig, options) {
  // options validation
  if (options) {
    if (typeof options !== 'object' || Array.isArray(options))
      throw new Error('options isn’t an object. Please see README.');
    if (
      (options.config && typeof options !== 'string' && typeof options !== 'object') ||
      Array.isArray(options)
    )
      throw new Error('options.config must be a config object or a path to a PostCSS config file.');
  }

  let worker, pool;

  const dependencies = new Map();

  return {
    name: '@snowpack/postcss-transform',
    async transform({id, srcPath, fileExt, contents}) {
      let {input = ['.css'], config} = options;

      if (!input.includes(fileExt) || !contents) return;

      if (config && typeof config === 'string') {
        config = path.resolve(config);
      }

      pool = pool || workerpool.pool(require.resolve('./worker.js'));
      worker = worker || (await pool.proxy());

      const encodedResult = await worker.transformAsync(contents, {
        config,
        filepath: srcPath || id, // note: srcPath will be undefined in snowpack@3.6.1 and older
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
      const {css, map, messages} = JSON.parse(encodedResult);

      const patterns = new Set();
      for (const message of messages) {
        if (message.type === 'dependency') {
          patterns.add(normalizePath(message.file));
        } else if (message.type === 'dir-dependency') {
          patterns.add(normalizePath(`${message.dir}/${message.glob || '**/*'}`));
        }
      }
      dependencies.set(id, patterns);

      return {
        code: css, // old API (keep)
        contents: css, // new API
        map,
      };
    },
    onChange({filePath}) {
      const normalizedFilePath = normalizePath(filePath);
      eachId: for (const [id, patterns] of dependencies) {
        for (const pattern of patterns) {
          if (minimatch(normalizedFilePath, pattern)) {
            this.markChanged(id);
            continue eachId;
          }
        }
      }
    },
    cleanup() {
      pool && pool.terminate();
    },
  };
};
