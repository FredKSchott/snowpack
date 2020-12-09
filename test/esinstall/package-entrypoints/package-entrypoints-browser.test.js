const {install} = require('../../../esinstall/lib');

/**
 * Browser configuration
 * https://github.com/defunctzombie/package-browser-field-spec
 */
describe('package-entrypoints browser configuration', () => {
  it('is able to resolve browser: path configuration', async () => {
    const cwd = __dirname;

    const targets = [
      // "browser": "index.js"
      'browser-path',
    ];

    const {
      importMap: {imports},
    } = await install(targets, {
      cwd,
    });

    // Loop over every target and ensure we are able to install
    for (let pkg of targets) {
      expect(imports[pkg]).toBeTruthy();
    }
  });

  it('is able to resolve browser object configuration', async () => {
    const cwd = __dirname;

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
    } = await install(targets, {
      cwd,
    });

    // Loop over every target and ensure we are able to install
    for (let pkg of targets) {
      expect(imports[pkg]).toBeTruthy();
    }
  });
});
