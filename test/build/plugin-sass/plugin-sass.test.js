const fs = require('fs');
const path = require('path');
const {setupBuildTest} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

describe('@snowpack/plugin-sass', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
  });

  it('ignores partials', () => {
    const buildContents = fs.readdirSync(path.join(cwd, '_dist_'));
    expect(buildContents).toEqual(['index.css']); // assert index.css AND ONLY index.css is output (ignore _partial.scss)
  });
});
