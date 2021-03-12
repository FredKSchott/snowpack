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

  it('import globs in source file are transformed correctly', () => {
    expect(stripWS(files['/_dist_/index.js']))
      .toEqual(`async function run() {
  const modules = {
    './pages/a.js': () => import('./pages/a.js'),
    './pages/b.js': () => import('./pages/b.js'),
    './pages/c.js': () => import('./pages/c.js')
  }

  for (const path in modules) {
    modules[path]().then((mod) => {
      console.log(path, mod)
    })
  }
};

run();
`);
  });
});
