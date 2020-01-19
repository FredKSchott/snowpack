const {readdirSync, readFileSync} = require('fs');
const pluginTester = require('babel-plugin-tester').default;
const babelPlugin = require('../../assets/babel-plugin.js');

process.chdir(__dirname);

for (const testName of readdirSync(__dirname)) {
  if (!testName.endsWith('.test.json')) {
    continue;
  }

  const testJson = JSON.parse(readFileSync(testName, {encoding: 'utf8'}));

  pluginTester({
    plugin: babelPlugin,
    pluginName: 'snowpack/assets/babel-plugin.js',
    pluginOptions: testJson.options,
    tests: {
      test: {
        code: testJson.input,
        output: testJson.output,
      },
    },
  });
}
