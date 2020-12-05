const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

describe('config: mount scripts (legacy)', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });

  it('mounted ./src', () => {
    const js = path.join(cwd, '_dist_', 'index.js');
    expect(fs.existsSync(js)).toBe(true); // file exists
    expect(fs.readFileSync(js, 'utf-8')).toBeTruthy(); // file has content
  });

  it('mounted ./public', () => {
    const html = path.join(cwd, 'index.html');
    expect(fs.existsSync(html)).toBe(true); // file exists
    expect(fs.readFileSync(html, 'utf-8')).toBeTruthy(); // file has content
  });
});
