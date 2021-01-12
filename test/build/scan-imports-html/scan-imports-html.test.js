const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('scan imports in HTML', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('HTML imports of packages are scanned', () => {
    expect(files['/_snowpack/pkg/array-flatten.js']).toBeDefined();
    expect(files['/_snowpack/pkg/css-package/style.css']).toBeDefined();
  });

  it('HTML imports of packages are rewritten', () => {
    expect(files['/dist/index.html']).toEqual(
      expect.stringContaining(`import {flatten} from '../_snowpack/pkg/array-flatten.js';`),
    );
    expect(files['/dist/index.html']).toEqual(
      expect.stringContaining(`@import "../_snowpack/pkg/css-package/style.css";`),
    );
  });
});
