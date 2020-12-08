const os = require('os');
const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const IMPORTS = ['ansi-styles', 'chalk'];
const cwd = path.join(__dirname, 'build');
let files = {};

describe('core: web_modules resolution', () => {
  beforeAll(() => {
    const capitalize = os.platform() === 'win32'; // for Windows, we capitalize this one directory to see if Snowpack can still resolve
    setupBuildTest(capitalize ? __dirname.toUpperCase() : __dirname);

    files = readFiles(cwd);
  });

  it('resolves web_modules without case-sensitivity', () => {
    IMPORTS.forEach((i) => {
      expect(files['/_dist_/index.js']).toEqual(
        expect.stringContaining(`import '../web_modules/${i}.js';`),
      );
    });
  });
});
