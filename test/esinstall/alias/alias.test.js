const path = require('path');
const {readFiles} = require('../../test-utils');
const {runTest} = require('../esinstall-test-utils.js');

describe('config-alias', () => {
  it('uses aliases when specified', async () => {
    await runTest(['react', 'react-dom', 'vue', 'vue-currency-input'], {
      alias: {
        react: 'preact/compat',
        'react-dom': 'preact/compat',
        vue: 'vue/dist/vue.esm.browser.js',
        'vue-currency-input': 'vue-currency-input/dist/vue-currency-input.esm.js',
      },
      cwd: __dirname,
    });

    const files = readFiles(path.join(__dirname, 'web_modules'));

    // positive test: verify aliases were used
    expect(files['/preact/compat.js']).toBeTruthy();
    expect(files['/vue/dist/vue.esm.browser.js']).toBeTruthy();
    expect(files['/vue-currency-input/dist/vue-currency-input.esm.js']).toBeTruthy();

    // inverse test: verify unaliased packages weren’t also installed
    expect(files['/react/react.js']).toBeUndefined();
    expect(files['/react-dom/react-dom.js']).toBeUndefined();
  });
});
