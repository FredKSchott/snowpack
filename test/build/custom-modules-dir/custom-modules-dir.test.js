const fs = require('fs');
const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('buildOptions.webModulesUrl', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(['_dist_/index.js'], {cwd});
  });

  it('snowpack: installs in specified directory', () => {
    const webModulesUrl = path.join(cwd, 'my_modules');
    expect(fs.existsSync(webModulesUrl)).toBe(true);
  });

  it('JS: uses webModulesUrl', () => {
    expect(files['/_dist_/index.js']).toEqual(
      expect.stringContaining(`import {flatten} from '../my_modules/array-flatten.js';`),
    );
  });
});
