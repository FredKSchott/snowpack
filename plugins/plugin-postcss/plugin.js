'use strict';

const path = require('path');
const workerpool = require('workerpool');

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
    async transform({id, fileExt, contents}) {
      let {input = ['.css'], config} = options;

      if (!input.includes(fileExt) || !contents) return;

      if (config && typeof config === 'string') {
        config = path.resolve(config);
      }

      pool = pool || workerpool.pool(require.resolve('./worker.js'));
      worker = worker || (await pool.proxy());

      const encodedResult = await worker.transformAsync(contents, {
        config,
        filepath: id,
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

      const files = new Set();
      const dirs = new Set();
      for (const message of messages) {
        if (message.type === 'dependency') {
          files.add(message.file);
        } else if (message.type === 'dir-dependency') {
          dirs.add(message.dir);
        }
      }
      dependencies.set(id, {files, dirs});

      return {
        code: css, // old API (keep)
        contents: css, // new API
        map,
      };
    },
    onChange({filePath}) {
      eachId: for (const [id, {files, dirs}] of dependencies) {
        for (const file of files) {
          if (file === filePath) {
            this.markChanged(id);
            continue eachId;
          }
        }
        for (const dir of dirs) {
          // https://stackoverflow.com/a/45242825
          const relativePath = path.relative(dir, filePath);
          const dirContainsFilePath =
            relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);

          if (dirContainsFilePath) {
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
