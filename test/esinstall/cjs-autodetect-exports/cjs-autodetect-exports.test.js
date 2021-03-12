const fs = require('fs');
const path = require('path');
const {runTest} = require('../esinstall-test-utils.js');

// This test simulates what keyboard-key is doing.
describe('Auto-detecting CJS exports', () => {
  it('should not attempt to convert package with invalid identifiers as exports', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-cjs-invalid-exports');
    const spec = 'cjs-invalid-exports';

    const {
      importMap: {imports},
    } = await runTest([spec], {
      cwd,
      dest,
    });

    const output = fs.readFileSync(path.join(dest, `${spec}.js`), 'utf8');
    expect(output).toEqual(
      // This shouldn't contain named exports
      expect.not.stringContaining(`export {`),
    );
  });

  it('should convert package with valid identifiers as exports', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-cjs-valid-exports');
    const spec = 'cjs-valid-exports';

    const {
      importMap: {imports},
    } = await runTest([spec], {
      cwd,
      dest,
    });

    const output = fs.readFileSync(path.join(dest, `${spec}.js`), 'utf8');
    expect(output).toEqual(
      // Correctly exports the valid identifiers as tree-shakeable identifiers
      expect.stringContaining(`export { entrypoint as __moduleExports, a, b, d };`),
    );
  });
});
