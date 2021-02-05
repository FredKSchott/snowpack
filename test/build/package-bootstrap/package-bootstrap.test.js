const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('package: bootstrap', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('resolves JS', () => {
    expect(files['/_dist_/index.js']).toEqual(
      expect.stringContaining(
        `import '../_snowpack/pkg/bootstrap--dist--css--bootstrap.min.css.proxy.js';`,
      ),
    );
  });
});
