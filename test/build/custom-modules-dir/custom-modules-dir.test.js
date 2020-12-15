const fs = require('fs');
const path = require('path');
const snowpack = require('../../../snowpack');
const {getFile} = require('../../test-utils');

const TEST_ROOT = __dirname;
const TEST_OUT = path.join(__dirname, 'build');
let result;

 

describe('buildOptions.webModulesUrl', () => {
  beforeAll(async () => {
    const config = snowpack.createConfiguration({
      root: TEST_ROOT,
      mount: {
        [path.resolve(TEST_ROOT, './src')]: '/_dist_',
      },
      buildOptions: {
        out: TEST_OUT,
        webModulesUrl: '/my_modules',
      },
    });
    const {result: _result} = await snowpack.buildProject({config, lockfile: null});
    result = _result;
  });

  it('snowpack: installs in specified directory', () => {
    const webModulesUrl = path.join(TEST_OUT, 'my_modules');
    expect(fs.existsSync(webModulesUrl)).toBe(true);
  });

  it('JS: uses webModulesUrl', () => {
    expect( getFile(result, TEST_OUT, './_dist_/index.js')).toEqual(
      expect.stringContaining(`import {flatten} from '../my_modules/array-flatten.js';`),
    );
  });
});
