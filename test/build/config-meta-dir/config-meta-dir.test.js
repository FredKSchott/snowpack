const fs = require('fs');
const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('config: buildOptions.metaDir', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(['index.js', 'sub/index.js'], {cwd});
  });

  it('builds snowpack env', () => {
    const envFile = path.join(cwd, 'static', 'snowpack', 'env.js');
    expect(fs.existsSync(envFile)).toBe(true); // file exists
    expect(fs.readFileSync(envFile, 'utf-8')).toBeTruthy(); // file has contents
  });

  it('resolves snowpack env', () => {
    expect(files['/index.js']).toEqual(
      expect.stringContaining(`import __SNOWPACK_ENV__ from './static/snowpack/env.js';`),
    );
    expect(files['/sub/index.js']).toEqual(
      expect.stringContaining(`import __SNOWPACK_ENV__ from '../static/snowpack/env.js';`),
    );
  });
});
