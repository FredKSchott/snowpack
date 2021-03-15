const path = require('path');
const {setupBuildTest, readFiles, stripWS} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');
let files = {};

describe('import-glob', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);
    files = readFiles(cwd);
    console.log(files);
  });

  it('import.meta.glob is transformed correctly', () => {
    expect(stripWS(files['/_dist_/glob.js']))
      .toEqual(`const modules = {
  './pages/a.js': () => import('./pages/a.js'),
  './pages/b.js': () => import('./pages/b.js'),
  './pages/c.js': () => import('./pages/c.js')
}
`);
  });

  it('import.meta.globEager is transformed correctly', () => {
    expect(stripWS(files['/_dist_/glob.js']))
      .toEqual(`const modules = {
  './pages/a.js': () => import('./pages/a.js'),
  './pages/b.js': () => import('./pages/b.js'),
  './pages/c.js': () => import('./pages/c.js')
}
`);
  });
});
