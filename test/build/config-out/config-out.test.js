const fs = require('fs');
const path = require('path');
const snowpack = require('../../../snowpack');

const TEST_ROOT = __dirname;
const TEST_OUT = path.join(__dirname, 'TEST_BUILD_OUT');
let result;

function getFile(id) {
  return result[path.resolve(TEST_OUT, id)].contents;
}

describe('config: buildOptions.out', () => {
  beforeAll(async () => {
    const config = snowpack.createConfiguration({
      root: TEST_ROOT,
      mount: {
        [path.resolve(TEST_ROOT, './src')]: '/src',
      },
      buildOptions: {
        clean: true,
        out: TEST_OUT,
      },
    });
    const {result: _result} = await snowpack.buildProject({config, lockfile: null});
    result = _result;
    console.log(result);
  });

  it('respects buildOptions.out', () => {
    expect(getFile('./src/index.js')).toBeDefined(); // JS file exists
    expect(getFile('./__snowpack__/env.js')).toBeDefined(); // JS file exists
  });
});
