const path = require('path');
const {install} = require('../../../esinstall/lib');

describe('package node-fetch', () => {
  it('allows importing node-fetch', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-node-fetch');
    const spec = 'node-fetch';

    const {
      importMap: {imports}
    } = await install([spec], {
      cwd,
      dest
    });

    expect(imports[spec]).toBeTruthy();
  });
});