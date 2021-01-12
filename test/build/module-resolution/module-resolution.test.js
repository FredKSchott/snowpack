const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('module resolution', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('JS: resolves pkg URLs relatively', () => {
    expect(files['/src.js']).toEqual(expect.stringContaining(`import './_snowpack/pkg/preact.js';`));
  });

  it('HTML: <script> tags also resolve relatively', () => {
    expect(files['/index.html']).toEqual(
      expect.stringContaining(`import preact from './_snowpack/pkg/preact.js';`),
    );
    expect(files['/folder-1/index.html']).toEqual(
      expect.stringContaining(`import preact from '../_snowpack/pkg/preact.js';`),
    );
    expect(files['/folder-1/folder-2/index.html']).toEqual(
      expect.stringContaining(`import preact from '../../_snowpack/pkg/preact.js';`),
    );
  });

  // TODO(drew): an “absolute” mode has been discussed as an option, however, it‘s tricky as it must factor in metaUrl, baseUrl, and more
});
