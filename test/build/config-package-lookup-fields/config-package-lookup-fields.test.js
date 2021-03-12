const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('custom packageLookupFields', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('Uses the configuration in the package.json', () => {
    expect(files['/src/index.js']).toEqual(
      expect.stringContaining(`import '../_snowpack/pkg/some-custom-lookup-package.js';`),
    );
    expect(files['/_snowpack/pkg/some-custom-lookup-package.js']).toEqual(
      expect.stringContaining(`console.log('TEST: THIS IS THE GOOD ENTRYPOINT');`),
    );
  })
});