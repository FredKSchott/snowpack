const fs = require('fs');
const path = require('path');
const snowpack = require('../../../snowpack');

const TEST_ROOT = __dirname;
const TEST_OUT = path.join(__dirname, 'TEST_BUILD_OUT');

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
    await snowpack.buildProject({config, lockfile: null});
  });

  it('respects buildOptions.out', () => {
    const distJSLoc = path.join(TEST_OUT, 'src', 'index.js');
    expect(fs.existsSync(distJSLoc)).toBe(true); // JS file exists

    const snowpackMetaLoc = path.join(TEST_OUT, '__snowpack__', 'env.js');
    expect(fs.existsSync(snowpackMetaLoc)).toBe(true); // snowpack meta exists
  });
});
