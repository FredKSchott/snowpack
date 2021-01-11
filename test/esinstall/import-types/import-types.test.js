const path = require('path');
const {runTest} = require('../esinstall-test-utils.js');

describe('importing types', () => {
  it('preserves the types', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-types-only');
    const spec = 'type-only-pkg';

    const {
      importMap: {imports},
    } = await runTest([spec, 'array-flatten'], {
      cwd,
      dest,
    });

    // This package should not have been installed because it only contains types.
    expect(imports[spec]).toBeFalsy();
  });
});
