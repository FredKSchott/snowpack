const path = require('path');
const {install} = require('../../../esinstall/lib');

describe('polyfill node', () => {
  it('is enabled through polyfillNode', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-polyfill-node');
    const spec = 'node-builtin-pkg';

    const {
      importMap: {imports}
    } = await install([spec], {
      cwd,
      dest,
      polyfillNode: true
    });

    expect(imports[spec]).toBeTruthy();
  });
});
