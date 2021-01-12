const fs = require('fs');
const path = require('path');
const {runTest} = require('../esinstall-test-utils.js');

describe('polyfill node', () => {
  it('is enabled through polyfillNode', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-polyfill-node');
    const spec = 'node-builtin-pkg';

    const {
output,
      importMap: {imports},
    } = await runTest([spec], {
      cwd,
      dest,
      polyfillNode: true,
    });
    console.error(output, imports);
    const fileOutput = fs.readFileSync(path.join(dest, `${spec}.js`), 'utf8');

    // test fileOutput (note: this may be a bit too close to a snapshot, but pay attention to changes here)
    expect(fileOutput).toEqual(
      // This is testing that path.dirname is implemented
      expect.stringContaining(`function dirname(path) {`),
    );
  });
});
