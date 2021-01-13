const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

describe('bugfix: named import', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });

  // if this file built successfully, then the ipmort worked
  it('built', () => {
    const webModuleLoc = path.join(__dirname, 'build', '_snowpack', 'pkg', 'array-flatten.js');

    expect(fs.existsSync(webModuleLoc)).toBe(true);
    expect(fs.readFileSync(webModuleLoc, 'utf8')).toBeTruthy();
  });
});
