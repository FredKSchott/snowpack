const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('package: bootstrap', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('transforms relative URLs correctly', () => {
    // The original bug was that when setting bundle: true, URLs were incorrectly transformed.
    // This tests that `//dist/components//Articles.js` doesn’t happen anymore.

    expect(files['/dist/index.js']).toEqual(
      expect.stringContaining(`lazy(()=>import("./components/Articles.js")`),
    );
  });
});
