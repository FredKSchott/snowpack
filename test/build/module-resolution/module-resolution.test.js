const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('module resolution', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(
      ['src.js', 'index.html', 'folder-1/index.html', 'folder-1/folder-2/index.html'],
      {cwd},
    );
  });

  it('JS: resolves web_modules relatively', () => {
    expect(files['/src.js']).toEqual(expect.stringContaining(`import './web_modules/preact.js';`));
  });

  it('HTML: <script> tags also resolve relatively', () => {
    expect(files['/index.html']).toEqual(
      expect.stringContaining(`import preact from './web_modules/preact.js';`),
    );
    expect(files['/folder-1/index.html']).toEqual(
      expect.stringContaining(`import preact from '../web_modules/preact.js';`),
    );
    expect(files['/folder-1/folder-2/index.html']).toEqual(
      expect.stringContaining(`import preact from '../../web_modules/preact.js';`),
    );
  });

  // TODO(drew): an “absolute” mode has been discussed as an option, however, it‘s tricky as it must factor in metaUrl, baseUrl, and more
});
