const fs = require('fs');
const path = require('path');
const {fileLines} = require('../../test-utils');

const distJS = fileLines(path.join(__dirname, 'build', '_dist_', 'index.js'));

describe('buildOptions.webModulesUrl', () => {
  it('snowpack: installs in specified directory', () => {
    const webModulesUrl = path.join(__dirname, 'build', 'my_modules');
    expect(fs.existsSync(webModulesUrl)).toBe(true);
  });

  it('JS: uses webModulesUrl', () => {
    expect(distJS[1]).toBe(`import {flatten} from '../my_modules/array-flatten.js';`);
  });
});
