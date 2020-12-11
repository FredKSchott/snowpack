const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

describe('config: TypeScript config', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });

  it('mounts & builds correctly', () => {
    const webModuleLoc = path.join(cwd, '_dist_', 'index.js');

    expect(fs.existsSync(webModuleLoc)).toBe(true);
  });
});
