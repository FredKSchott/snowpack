const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('package: bootstrap', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(['_dist_/index.js'], {cwd});
  });

  it('resolves JS', () => {
    expect(files['/_dist_/index.js']).toEqual(
      expect.stringContaining(
        `import '../web_modules/bootstrap/dist/css/bootstrap.min.css.proxy.js';`,
      ),
    );
  });
});
