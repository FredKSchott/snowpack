const fs = require('fs-extra');
const path = require('path');
const {install} = require('../../../esinstall/lib');

describe('include-missing-in-package-json', () => {
  beforeAll(() => {
    // copy packages/* to node_modules/*
    fs.readdirSync(path.join(__dirname, 'packages')).forEach((pkg) => {
      fs.copySync(path.join(__dirname, 'packages', pkg), path.join(__dirname, 'node_modules', pkg));
    });
  });

  it('resolves packages in node_modules but not package.json', async () => {
    const installTargets = ['@material/animation', 'tslib'];

    // install
    const {
      importMap: {imports},
    } = await install(installTargets, {cwd: __dirname});

    // ensure all targets built
    for (const target of installTargets) {
      expect(imports[target]).toBeTruthy();
    }
  });
});
