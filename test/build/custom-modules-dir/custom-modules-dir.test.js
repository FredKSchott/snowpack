const fs = require('fs');
const path = require('path');

const cwd = path.join(__dirname, 'build');

const distJS = fs.readFileSync(path.join(cwd, '_dist_', 'index.js'), 'utf-8');

describe('buildOptions.webModulesUrl', () => {
  it('snowpack: installs in specified directory', () => {
    const webModulesUrl = path.join(cwd, 'my_modules');
    expect(fs.existsSync(webModulesUrl)).toBe(true);
  });

  it('JS: uses webModulesUrl', () => {
    expect(distJS).toEqual(
      expect.stringContaining(`import {flatten} from '../my_modules/array-flatten.js';`),
    );
  });
});
