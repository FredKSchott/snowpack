const path = require('path');
const {install} = require('../../../esinstall/lib');

describe('importing types', () => {
  it('preserves the types', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-types-only');
    const spec = 'type-only-pkg';

    const {
      importMap: {imports},
    } = await install([spec, 'array-flatten'], {
      cwd,
      dest,
    });

    console.log(imports);

    // This package should not have been installed because it only contains types.
    expect(imports[spec]).toBeFalsy();
  });
});
