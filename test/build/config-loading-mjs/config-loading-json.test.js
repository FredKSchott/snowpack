const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

const cwd = path.join(__dirname, 'TEST_BUILD_OUT');

// Skip tests on node@10.x (expected to fail)
describe = process.version.startsWith('v10') ? describe.skip : describe;

describe('config-loading: detects snowpack.config.mjs', () => {
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
