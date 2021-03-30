const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

describe('packageOptions.source: "remote-next"', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });

  it('installs packages on-demand to your local cache directory', () => {
    expect(
      fs.existsSync(
        path.join(__dirname, 'node_modules', '.cache', 'snowpack', 'source', 'package.json'),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(__dirname, 'node_modules', '.cache', 'snowpack', 'source', 'package-lock.json'),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          __dirname,
          'node_modules',
          '.cache',
          'snowpack',
          'source',
          'node_modules',
          'array-flatten',
        ),
      ),
    ).toBe(true);
  });
});
