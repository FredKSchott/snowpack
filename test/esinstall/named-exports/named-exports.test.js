const fs = require('fs');
const path = require('path');
const {install} = require('../../../esinstall/lib');

const cwd = __dirname;

describe('named-exports', () => {
  it('cjs', async () => {
    const pkg = 'cjs-named-exports-simple';
    const dest = path.join(cwd, 'test-cjs');
    await install([pkg], {cwd, dest});

    const output = fs.readFileSync(path.join(dest, `${pkg}.js`), 'utf8');

    // test output (note: this may be a bit too close to a snapshot, but pay attention to changes here)
    expect(output).toEqual(
      expect.stringContaining(
        `export { entrypoint as __moduleExports, export1, export2, export3, export4, export5 };`,
      ),
    );
  });

  it('cjs (re-exported)', async () => {
    const pkg = 'cjs-named-exports-reexported';
    const dest = path.join(cwd, 'test-cjs-02');
    await install([pkg], {cwd, dest});

    const output = fs.readFileSync(path.join(dest, `${pkg}.js`), 'utf8');

    // test output
    expect(output).toEqual(
      expect.stringContaining(`export { entrypoint as __moduleExports, export42$1 as export42 };`),
    );
  });

  it('umd', async () => {
    const pkg = 'umd-named-exports';
    const dest = path.join(cwd, 'test-umd');
    await install([pkg], {cwd, dest});

    const output = fs.readFileSync(path.join(dest, `${pkg}.js`), 'utf8');

    // test output
    expect(output).toEqual(expect.stringMatching(`export default autolayout;`));

    expect(output).toEqual(
      expect.stringContaining(
        `export { Attribute, Priority, Relation, SubView, View, VisualFormat, autolayout as __moduleExports };`,
      ),
    );
  });
});
