const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

describe('@snowpack/plugin-build-script', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });

  it('runs Babel on TS', () => {
    const jsLoc = path.join(cwd, '_dist_', 'index.js');
    expect(fs.existsSync(jsLoc)).toBe(true); // file exists
    expect(fs.readFileSync(jsLoc, 'utf-8')).toBeTruthy(); // file has content
  });

  it('doesn’t leave TS in build', () => {
    const tsLoc = path.join(cwd, '_dist_', 'index.ts');
    expect(fs.existsSync(tsLoc)).not.toBe(true); // file doesn’t exist
  });
});
