const {install} = require('../../../esinstall/lib');
const path = require('path');

describe('package-entrypoints', () => {
  it('Prefers the module field to main', async () => {
    console.log("THIS TEST IS RUNNING");

    const cwd = __dirname;
    const dest = path.join(cwd, 'test-module');
    const spec = 'package-entrypoints-module';

    console.log("BEFORE INSTALL");

    const {
      importMap: {imports},
    } = await install([spec], {
      cwd,
      dest,
    });

    console.log("AFTER INSTALL");

    expect(imports[spec]).toBeTruthy();
  });
});
