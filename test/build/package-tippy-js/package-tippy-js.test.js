const fs = require('fs');
const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('package: tippy.js', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('builds to the correct path', () => {
    const mainEntryLoc = path.join(cwd, '_snowpack', 'pkg', 'tippyjs.js');
    const assetsLoc = path.join(cwd, '_snowpack', 'pkg', 'tippyjs');

    expect(fs.existsSync(mainEntryLoc) && fs.statSync(mainEntryLoc).isFile()).toBe(true);
    expect(fs.existsSync(assetsLoc) && fs.statSync(assetsLoc).isDirectory()).toBe(true);
  });

  it('resolves imports', () => {
    expect(files['/_dist_/index.js']).toEqual(
      expect.stringContaining(`import tippy from '../_snowpack/pkg/tippyjs.js';`),
    );
  });
});
