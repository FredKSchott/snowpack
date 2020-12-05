const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

describe('bugfix: named import', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });

  // if this file built successfully, then the ipmort worked
  it('built', () => {
    const webModule = path.join(__dirname, 'build', 'web_modules', 'array-flatten.js');

    expect(fs.existsSync(webModule)).toBe(true);
    expect(fs.readFileSync(webModule, 'utf-8')).toBeTruthy();
  });
});
