const fs = require('fs');
const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('config: environment', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('Should load environment from config', () => {
    const snowpackEnv = fs.readFileSync(path.join(cwd, '_snowpack', 'env.js'), 'utf8');
    expect(snowpackEnv).toEqual(
      expect.stringContaining(`export const FOO = "bar";`),
    );
  })
});
