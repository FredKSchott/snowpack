const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('TypeScript', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
    files = readFiles(cwd);
  });

  it('is compiled', () => {
    expect(files['/dir/a.js']).toBeTruthy();
    expect(files['/dir/b.js']).toBeTruthy();
    expect(files['/dir/c.js']).toBeTruthy();
  });
});
