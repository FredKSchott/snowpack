const fs = require('fs');
const path = require('path');
const {install} = require('../../../esinstall/lib');

describe('polyfill node', () => {
  it('is enabled through polyfillNode', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-polyfill-node');
    const spec = 'node-builtin-pkg';

    const {
      importMap: {imports},
    } = await install([spec], {
      cwd,
      dest,
      polyfillNode: true,
    });

    const output = fs.readFileSync(path.join(dest, `${spec}.js`), 'utf8');

    // test output (note: this may be a bit too close to a snapshot, but pay attention to changes here)
    expect(output).toEqual(
      // This is testing that path.dirname is implemented
      expect.stringContaining(`function dirname(path) {`),
    );
  });
});
