const path = require('path');
const {readFiles, setupBuildTest} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('config: packageOptions.external', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('preserves external package', () => {
    expect(files['/_dist_/index.js']).toEqual(expect.stringContaining(`import 'fs';`));
  });
});
