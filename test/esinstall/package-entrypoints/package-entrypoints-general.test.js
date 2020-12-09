const {install} = require('../../../esinstall/lib');

describe('package-entrypoints general tests', () => {
  it('Supports packages with a dot in the name', async () => {
    const cwd = __dirname;

    const targets = ['pkg-with-dot.in-the-name'];

    const {
      importMap: {imports},
    } = await install(targets, {
      cwd,
    });

    // Loop over every target and ensure we are able to install
    for (let pkg of targets) {
      expect(imports[pkg]).toBeTruthy();
    }
  });

  it('Prefers the module field to main', async () => {
    const cwd = __dirname;
    const targets = ['module'];

    const {
      importMap: {imports},
    } = await install(targets, {
      cwd,
    });

    // Loop over every target and ensure we are able to install
    for (let pkg of targets) {
      expect(imports[pkg]).toBeTruthy();
    }
  });

  it('Prefers the jsnext:main field to main', async () => {
    const cwd = __dirname;
    const targets = ['jsnext-main'];

    const {
      importMap: {imports},
    } = await install(targets, {
      cwd,
    });

    // Loop over every target and ensure we are able to install
    for (let pkg of targets) {
      expect(imports[pkg]).toBeTruthy();
    }
  });
});
