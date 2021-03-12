const fs = require('fs');
const path = require('path');
const {runTest} = require('../esinstall-test-utils.js');

describe('package node-fetch', () => {
  it('allows importing node-fetch', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-node-fetch');
    const spec = 'node-fetch';

    const {
      importMap: {imports},
    } = await runTest([spec], {
      cwd,
      dest,
    });

    const output = fs.readFileSync(path.join(dest, `${spec}.js`), 'utf8');
    expect(output).toEqual(
      // This is testing that path.dirname is implemented
      expect.stringContaining(`global.fetch.bind(global);`),
    );
  });
});
