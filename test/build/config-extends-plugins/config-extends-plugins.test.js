const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

describe('config: extends', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });

  it('loads the appropriate plugins', () => {
    const snowpackEnv = fs.readFileSync(path.join(cwd, '_snowpack', 'env.js'), 'utf8');
    expect(snowpackEnv).toEqual(
      expect.stringContaining(`export const SNOWPACK_PUBLIC_SECRET_VALUE = "pumpernickel";`),
    );
  });
});
