const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('import named exports from a package with only default export', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
    files = readFiles(cwd);
  });
});
