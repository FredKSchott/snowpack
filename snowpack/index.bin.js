#!/usr/bin/env node
'use strict';

const ver = process.versions.node;
const majorVer = parseInt(ver.split('.')[0], 10);

if (majorVer < 10) {
  console.error('Node version ' + ver + ' is not supported, please use Node.js 10.0 or higher.');
  process.exit(1);
}

const cli = require('./lib/index.js');
const run = cli.run || cli.cli || cli.default;
run(process.argv).catch(function (error) {
  console.error(`
${error.stack || error.message || error}
`);
  process.exit(1);
});
