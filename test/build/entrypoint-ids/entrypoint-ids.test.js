const os = require('os');
const path = require('path');
const snowpack = require('../../../snowpack');

const capitalize = os.platform() === 'win32'; // for Windows, we capitalize this one directory to see if Snowpack can still resolve
const TEST_ROOT = capitalize ? __dirname.toUpperCase() : __dirname;
const TEST_OUT = path.join(__dirname, 'build');
let result;

function getFile(id) {
  return result[path.resolve(TEST_OUT, id)].contents;
}

const IMPORTS = ['ansi-styles', 'chalk'];

describe('core: web_modules resolution', () => {
  beforeAll(async () => {
    const config = snowpack.createConfiguration({
      root: TEST_ROOT,
      mount: {
        [path.resolve(TEST_ROOT, './src')]: '/_dist_',
      },
      buildOptions: {
        out: TEST_OUT,
      },
    });
    const {result: _result} = await snowpack.buildProject({config, lockfile: null});
    result = _result;
  });

  it('resolves web_modules without case-sensitivity', () => {
    IMPORTS.forEach((i) => {
      expect(getFile('./_dist_/index.js')).toEqual(
        expect.stringContaining(`import '../web_modules/${i}.js';`),
      );
    });
  });
});
