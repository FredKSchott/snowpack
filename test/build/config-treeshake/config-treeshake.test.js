const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

// Note(drew): full disclosure, I do not know what this test was originally-testing; it was not clear from the snapshot (the snapshot had functions that seemed like they should have been treeshaken)

describe('optimize.treeshake', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });

  it('built array-flatten.js', () => {
    const webModuleLoc = path.join(cwd, '_snowpack', 'pkg', 'array-flatten.js');

    expect(fs.existsSync(webModuleLoc)).toBe(true); // file exists
    expect(fs.readFileSync(webModuleLoc, 'utf8')).toBeTruthy(); // file has contents
  });

  it('built async.js', () => {
    const webModuleLoc = path.join(cwd,'_snowpack', 'pkg', 'async.js');

    expect(fs.existsSync(webModuleLoc)).toBe(true); // file exists
    expect(fs.readFileSync(webModuleLoc, 'utf8')).toBeTruthy(); // file has contents
  });
});
