const fs = require('fs');
const path = require('path');
const snowpack = require('../../../snowpack');
const {getFile} = require('../../test-utils');

const TEST_ROOT = __dirname;
const TEST_OUT = path.join(__dirname, 'build');
let result;

 

describe('package: tippy.js', () => {
  beforeAll(async () => {
    const config = snowpack.createConfiguration({
      root: TEST_ROOT,
      mount: {
        [path.resolve(TEST_ROOT, './src')]: '/_dist_',
      },
      buildOptions: {
        out: TEST_OUT,
        minify: false,
      },
    });
    const {result: _result} = await snowpack.buildProject({config, lockfile: null});
    result = _result;
  });

  it('builds to the correct path', () => {
    const mainEntryLoc = path.join(TEST_OUT, 'web_modules', 'tippyjs.js');
    const assetsLoc = path.join(TEST_OUT, 'web_modules', 'tippyjs');

    expect(fs.existsSync(mainEntryLoc) && fs.statSync(mainEntryLoc).isFile()).toBe(true);
    expect(fs.existsSync(assetsLoc) && fs.statSync(assetsLoc).isDirectory()).toBe(true);
  });

  it('resolves imports', () => {
    expect( getFile(result, TEST_OUT, './_dist_/index.js')).toEqual(
      expect.stringContaining(`import tippy from '../web_modules/tippyjs.js';`),
    );
  });
});
