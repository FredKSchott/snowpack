const workerpool = require('workerpool');
const babel = require('@babel/core');

async function transformFileAsync(path, options) {
  const {code, map} = await babel.transformFileAsync(path, options);
  return JSON.stringify({code, map});
}

// create a worker and register public functions
workerpool.worker({
  transformFileAsync,
});
