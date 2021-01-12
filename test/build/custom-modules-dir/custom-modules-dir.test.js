const fs = require('fs');
const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('buildOptions.metaUrlPath', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('snowpack: installs in specified directory', () => {
    const metaUrlPath = path.join(cwd, 'my_meta');
    expect(fs.existsSync(metaUrlPath)).toBe(true);
  });

  it('JS: uses metaUrlPath', () => {
    expect(files['/_dist_/index.js']).toEqual(
      expect.stringContaining(`import {flatten} from "../my_meta/pkg/array-flatten.js";`),
    );
  });
});
