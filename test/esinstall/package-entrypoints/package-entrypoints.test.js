const {install} = require('../../../esinstall/lib');
const path = require('path');

describe('package-entrypoints', () => {
  it('Prefers the module field to main', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-module');
    const spec = 'package-entrypoints-module';

    const {
      importMap: {imports},
    } = await install([spec], {
      cwd,
      dest,
    });

    expect(imports[spec]).toBeTruthy();
  });
});
