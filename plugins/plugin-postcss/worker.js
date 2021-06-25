'use strict';

const workerpool = require('workerpool');
const postcss = require('postcss');
const postcssrc = require('postcss-load-config');
const loadPlugins = require('postcss-load-config/src/plugins.js');
const loadOptions = require('postcss-load-config/src/options.js');

const processMap = new Map();

async function transformAsync(css, {filepath, config, cwd, map}) {
  let process = null;
  const key = config + '-' + cwd;

  // Initialize processor. `config`, `cwd` won't change until Snowpack is restarted
  if (!processMap.has(key)) {
    let plugins = [];
    let options = {};
    if (typeof config === 'object') {
      plugins = loadPlugins(config);
      options = loadOptions(config);
    } else {
      const rc = await postcssrc({}, config || cwd);
      plugins = rc.plugins;
      options = rc.options;
    }
    const processor = postcss(plugins);
    process = (css, filepath, map) => processor.process(css, {...options, from: filepath, map});
    processMap.set(key, process);
  }
  process = processMap.get(key);

  const result = await process(css, filepath, map);
  return JSON.stringify({css: result.css, map: result.map, messages: result.messages});
}

// create a worker and register public functions
workerpool.worker({
  transformAsync,
});
