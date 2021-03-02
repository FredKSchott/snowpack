const path = require('path');
const {runTest} = require('../esinstall-test-utils.js');
const fs = require('fs');


describe('import-meta', () => {
  it('Copies to the web_modules folder', async () => {
    const dest = path.join(__dirname, `test-import-meta`);

    // import the file directly
    const spec = `mock-pkg-import-meta`;

    // run it through esinstall
    const {
      importMap: {imports},
    } = await runTest([spec], {cwd: __dirname, dest});

    // Test that wasm was copied
    const files = await fs.promises.readdir(path.join(dest, 'assets'));
    expect(files.length).toEqual(1);
    expect(files[0].endsWith('.wasm')).toBeTruthy();
  });
});
