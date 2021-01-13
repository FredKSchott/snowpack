const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

describe('bad config value', () => {

  it('Gives an error message', () => {
    expect(() => setupBuildTest(__dirname)).toThrow('- snowpack.buildOptions.ssr is not of a type(s) boolean');
    expect(readFiles(cwd)).toMatchObject({});
  })
});
