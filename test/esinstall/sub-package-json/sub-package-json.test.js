const path = require('path');
const {runTest} = require('../esinstall-test-utils.js');

describe('sub package with package.json', () => {
  it('resolves to the right place', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-sub-package-json');
    const spec = 'solid-js/dom';

    const {
      importMap: {imports},
    } = await runTest([spec], {
      cwd,
      dest,
    });

    expect(imports[spec]).toBeTruthy();
  });
});
