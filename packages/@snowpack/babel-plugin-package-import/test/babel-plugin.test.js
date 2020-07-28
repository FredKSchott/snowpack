const path = require('path');
const pluginTester = require('babel-plugin-tester').default;
const babelPlugin = require('../plugin.js');

process.chdir(path.join(__dirname, 'cwd'));

pluginTester({
  plugin: babelPlugin,
  pluginName: 'snowpack/assets/babel-plugin.js',
  fixtures: path.join(__dirname, 'fixtures'),
});

pluginTester({
  plugin: babelPlugin,
  pluginName: 'snowpack/assets/babel-plugin.js',
  fixtures: path.join(__dirname, 'fixtures-absolute'),
  pluginOptions: {
    importMap: path.resolve(process.cwd(), 'web_modules/import-map-absolute.test.json'),
  },
});
