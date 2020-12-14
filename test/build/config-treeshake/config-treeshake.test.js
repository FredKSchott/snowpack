const fs = require('fs');
const path = require('path');
const snowpack = require('../../../snowpack');

const TEST_ROOT = __dirname;
const TEST_OUT = path.join(__dirname, 'build');

// Note(drew): full disclosure, I do not know what this test was originally-testing; it was not clear from the snapshot (the snapshot had functions that seemed like they should have been treeshaken)

describe('installOptions.treeshake', () => {
  beforeAll(async () => {
    const [, config] = snowpack.createConfiguration({
      root: TEST_ROOT,
      installOptions: {
        treeshake: true,
      },
      mount: {
        [path.resolve(TEST_ROOT, './src')]: '/_dist_',
      },
      buildOptions: {
        out: TEST_OUT,
      },
    });
    await snowpack.buildProject({config, lockfile: null});
  });

  it('built web_modules/array-flatten.js', () => {
    const webModuleLoc = path.join(TEST_OUT, 'web_modules', 'array-flatten.js');

    expect(fs.existsSync(webModuleLoc)).toBe(true); // file exists
    expect(fs.readFileSync(webModuleLoc, 'utf8')).toBeTruthy(); // file has contents
  });

  it('built web_modules/async.js', () => {
    const webModuleLoc = path.join(TEST_OUT, 'web_modules', 'async.js');

    expect(fs.existsSync(webModuleLoc)).toBe(true); // file exists
    expect(fs.readFileSync(webModuleLoc, 'utf8')).toBeTruthy(); // file has contents
  });
});
