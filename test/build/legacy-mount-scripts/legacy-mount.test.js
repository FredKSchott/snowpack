const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

describe('config: mount scripts (legacy)', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });

  it('mounted ./src', () => {
    const jsLoc = path.join(cwd, '_dist_', 'index.js');
    expect(fs.existsSync(jsLoc)).toBe(true); // file exists
    expect(fs.readFileSync(jsLoc, 'utf8')).toBeTruthy(); // file has content
  });

  it('mounted ./public', () => {
    const htmlLoc = path.join(cwd, 'index.html');
    expect(fs.existsSync(htmlLoc)).toBe(true); // file exists
    expect(fs.readFileSync(htmlLoc, 'utf8')).toBeTruthy(); // file has content
  });
});
