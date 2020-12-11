const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

describe('config: instantiated objects', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });

  it('instantiated objects don’t affect build', () => {
    expect(fs.existsSync(path.join(cwd, '_dist_', 'index.js'))).toBe(true);
  });
});
