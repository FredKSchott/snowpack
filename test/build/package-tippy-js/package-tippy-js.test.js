const fs = require('fs');
const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('package: tippy.js', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(['_dist_/index.js'], {cwd});
  });

  it('builds to the correct path', () => {
    const mainEntry = path.join(cwd, 'web_modules', 'tippyjs.js');
    const assets = path.join(cwd, 'web_modules', 'tippyjs');

    expect(fs.existsSync(mainEntry) && fs.statSync(mainEntry).isFile()).toBe(true);
    expect(fs.existsSync(assets) && fs.statSync(assets).isDirectory()).toBe(true);
  });

  it('resolves imports', () => {
    expect(files['/_dist_/index.js']).toEqual(
      expect.stringContaining(`import tippy from '../web_modules/tippyjs.js';`),
    );
  });
});
