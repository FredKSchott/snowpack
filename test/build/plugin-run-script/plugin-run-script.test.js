const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

describe('@snowpack/plugin-run-script', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });

  it('generates .scss -> .css', () => {
    const css = path.join(cwd, 'css', 'index.css');
    expect(fs.existsSync(css)).toBe(true); // file exists
    expect(fs.readFileSync(css, 'utf-8')).toBeTruthy(); // file has content
  });
});
