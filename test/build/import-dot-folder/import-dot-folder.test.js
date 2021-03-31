const path = require('path');
const {setupBuildTest, readFiles, stripWS} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('import-dot-folder', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
    files = readFiles(cwd);
    console.log(files);
  });

  it('importing files in a dot folder works', () => {
    expect(files['/_dist_/.dot/file.js']).toBeTruthy();
  });
});
