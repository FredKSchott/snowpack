const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

const cwd = path.join(__dirname, 'TEST_BUILD_OUT');

describe('config-loading: detects snowpack.config.cjs', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });

  it('picks up on configured buildOptions.out', () => {
    const distJSLoc = path.join(cwd, 'src', 'index.js');
    expect(fs.existsSync(distJSLoc)).toBe(true); // JS file exists

    const snowpackMetaLoc = path.join(cwd, '_snowpack', 'env.js');
    expect(fs.existsSync(snowpackMetaLoc)).toBe(true); // snowpack meta exists
  });
});
