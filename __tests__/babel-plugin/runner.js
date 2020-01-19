const path = require('path');
const pluginTester = require('babel-plugin-tester').default;
const babelPlugin = require('../../assets/babel-plugin.js');

process.chdir(__dirname);

pluginTester({
  plugin: babelPlugin,
  pluginName: 'snowpack/assets/babel-plugin.js',
  fixtures: path.join(__dirname, '__fixtures__'),
});
