const path = require('path');
const execa = require('execa');
const fs = require('fs');

fs.copyFileSync(
  require.resolve('source-map/lib/mappings.wasm'),
  path.join(__dirname, '../lib/mappings.wasm'),
);
// fs.copyFileSync(path.join(require.resolve('rollup-plugin-node-polyfills/package.json'), '../polyfills'), path.join(__dirname, '../polyfills'));
// execa.commandSync(`cp -r ${path.join(require.resolve('rollup-plugin-node-polyfills/package.json'), '../polyfills')} ${path.join(__dirname, '../polyfills')}`);

/**
 * Some packages just don't work with Rollup. As a workaround,
 * we just bundle the with Webpack instead which has much better
 * CJS support.
 */
module.exports = () => [
  {
    target: 'node',
    mode: 'production',
    entry: require.resolve('htmlparser2'),
    output: {
      path: path.resolve(__dirname, '../vendor/generated'),
      filename: '~htmlparser2.js',
      libraryTarget: 'commonjs',
    },
  },
  // {
  //     target: 'node',
  //     mode: 'development',
  //     entry: require.resolve('rollup-plugin-node-polyfills'),
  //     output: {
  //         path: path.resolve(__dirname, '../vendor/generated'),
  //         filename: '~rollup-plugin-node-polyfills.js',
  //         libraryTarget: 'commonjs',
  //     },
  // },
];
