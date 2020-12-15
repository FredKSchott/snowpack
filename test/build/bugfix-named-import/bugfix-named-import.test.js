const fs = require('fs');
const path = require('path');
const snowpack = require('../../../snowpack');

const TEST_ROOT = __dirname;
const TEST_OUT = path.join(__dirname, 'build');
let result;

describe('bugfix: named import', () => {
  beforeAll(async () => {
    const [, config] = snowpack.createConfiguration({
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

  // if this file built successfully, then the import worked
  it('built', () => {
    const webModuleLoc = path.join(TEST_OUT, 'web_modules', 'array-flatten.js');

    expect(fs.existsSync(webModuleLoc)).toBe(true);
    expect(fs.readFileSync(webModuleLoc, 'utf8')).toBeTruthy();
  });
});
