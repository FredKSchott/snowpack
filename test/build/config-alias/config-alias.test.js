const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('config: alias', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
    files = readFiles(cwd);
  });

  it('generates imports as expected', () => {
    expect(files['/_dist_/index.html']).toMatchSnapshot();
    expect(files['/_dist_/index.js']).toMatchSnapshot();
  });
});
