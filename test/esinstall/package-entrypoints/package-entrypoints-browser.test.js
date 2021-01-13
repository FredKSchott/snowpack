const {runTest} = require('../esinstall-test-utils.js');
const path = require('path');

/**
 * Browser configuration
 * https://github.com/defunctzombie/package-browser-field-spec
 */
describe('package-entrypoints browser configuration', () => {
  it('is able to resolve browser: path configuration', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-browser-path');

    const targets = [
      // "browser": "index.js"
      'browser-path',
    ];

    const {
      importMap: {imports},
    } = await runTest(targets, {
      cwd,
      dest,
    });

    // Loop over every target and ensure we are able to install
    for (let pkg of targets) {
      expect(imports[pkg]).toBeTruthy();
    }
  });

  it('is able to resolve browser object configuration', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-browser-object');

    const targets = [
      // The following are object based
      // ./index.js
      'browser-dot-slash-index-js',

      // ./index
      'browser-dot-slash-index',

      // index
      'browser-index',

      // index.js
      'browser-index-js',

      // .
      'browser-dot',

      // ./
      'browser-dot-slash',

      // invalid
      'browser-no-valid',
    ];

    const {
      importMap: {imports},
    } = await runTest(targets, {
      cwd,
      dest,
    });

    // Loop over every target and ensure we are able to install
    for (let pkg of targets) {
      expect(imports[pkg]).toBeTruthy();
    }
  });
});
