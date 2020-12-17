const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('scan imports in HTML', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('HTML imports of web_modules are scanned', () => {
    expect(files['/web_modules/array-flatten.js']).toBeDefined();
    expect(files['/web_modules/css-package/style.css']).toBeDefined();
  });

  it('HTML imports of web_modules are rewritten', () => {
    expect(files['/dist/index.html']).toEqual(
      expect.stringContaining(`import {flatten} from '../web_modules/array-flatten.js';`),
    );
    expect(files['/dist/index.html']).toEqual(
      expect.stringContaining(`@import "../web_modules/css-package/style.css";`),
    );
  });
});
