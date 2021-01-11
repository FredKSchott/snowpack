const {runTest} = require('../esinstall-test-utils.js');
const path = require('path');

describe('package-entrypoints general tests', () => {
  it('Supports packages with a dot in the name', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-dot-in-name');

    const targets = ['pkg-with-dot.in-the-name'];

    const {
      importMap: {imports},
    } = await runTest(targets, {
      cwd,
      dest,
    });

    // Loop over every target and ensure we are able to install
    for (let pkg of targets) {
      expect(imports[pkg]).toBeTruthy();
    }
  });

  it('Prefers the module field to main', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-module');
    const targets = ['module'];

    const {
      importMap: {imports},
    } = await runTest(targets, {
      cwd,
      dest,
    });

    // Loop over every target and ensure we are able to install
    for (let pkg of targets) {
      expect(imports[pkg]).toBeTruthy();
    }
  });

  it('Prefers the jsnext:main field to main', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-jsnext-main');
    const targets = ['jsnext-main'];

    const {
      importMap: {imports},
    } = await runTest(targets, {
      cwd,
      dest,
    });

    // Loop over every target and ensure we are able to install
    for (let pkg of targets) {
      expect(imports[pkg]).toBeTruthy();
    }
  });

  it('Supports "main" when it points to a folder', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-main-folder');
    const spec = 'main-folder';

    const {
      importMap: {imports},
    } = await runTest([spec], {
      cwd,
      dest,
    });

    expect(Object.keys(imports)).toHaveLength(1);
    expect(imports['main-folder']).toBeTruthy();
  });
});
