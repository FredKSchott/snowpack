#!/usr/bin/env node
'use strict';

const ver = process.versions.node;
const majorVer = parseInt(ver.split('.')[0], 10);

if (majorVer < 10) {
  console.error('Node version ' + ver + ' is not supported, please use Node.js 10.0 or higher.');
  process.exit(1);
}

let hasBundled = true

try {
  require.resolve('./index.bundled.js');
} catch(err) {
  // We don't have/need this on legacy builds and dev builds
  // If an error happens here, throw it, that means no Node.js distribution exists at all.
  hasBundled = false;
}

const cli = !hasBundled ? require('../') : require('./index.bundled.js');

if (cli.autoRun) {
  return;
}

const run = cli.run || cli.cli || cli.default;
run(process.argv).catch(function (error) {
  console.error(`
${error.stack || error.message || error}
`);
  process.exit(1);
});
