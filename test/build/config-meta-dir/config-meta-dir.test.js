const fs = require('fs');
const path = require('path');
const snowpack = require('../../../snowpack');

const TEST_ROOT = __dirname;
const TEST_OUT = path.join(__dirname, 'build');
let result;

function getFile(id) {
  return result[path.resolve(TEST_OUT, id)].contents;
}

describe('config: buildOptions.metaDir', () => {
  beforeAll(async () => {
    const config = snowpack.createConfiguration({
      root: TEST_ROOT,
      mount: {
        [path.resolve(TEST_ROOT, './public')]: '/',
      },
      buildOptions: {
        out: TEST_OUT,
        metaDir: '/static/snowpack',
      },
    });
    const {result: _result} = await snowpack.buildProject({config, lockfile: null});
    result = _result;
  });

  it('builds snowpack env', () => {
    const envFileLoc = path.join(TEST_OUT, 'static', 'snowpack', 'env.js');
    expect(fs.existsSync(envFileLoc)).toBe(true); // file exists
    expect(fs.readFileSync(envFileLoc, 'utf8')).toBeTruthy(); // file has contents
  });

  it('resolves snowpack env', () => {
    expect(getFile('./index.js')).toEqual(
      expect.stringContaining(`import __SNOWPACK_ENV__ from './static/snowpack/env.js';`),
    );
    expect(getFile('./sub/index.js')).toEqual(
      expect.stringContaining(`import __SNOWPACK_ENV__ from '../static/snowpack/env.js';`),
    );
  });
});
