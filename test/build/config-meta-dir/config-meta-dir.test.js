const fs = require('fs');
const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('config: buildOptions.metaUrlPath', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('builds snowpack env', () => {
    const envFileLoc = path.join(cwd, 'static', 'snowpack', 'env.js');
    expect(fs.existsSync(envFileLoc)).toBe(true); // file exists
    expect(fs.readFileSync(envFileLoc, 'utf8')).toBeTruthy(); // file has contents
  });

  it('resolves snowpack env', () => {
    expect(files['/index.js']).toEqual(
      expect.stringContaining(`import * as __SNOWPACK_ENV__ from './static/snowpack/env.js';`),
    );
    expect(files['/sub/index.js']).toEqual(
      expect.stringContaining(`import * as __SNOWPACK_ENV__ from '../static/snowpack/env.js';`),
    );
  });
});
