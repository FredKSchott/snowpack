const fs = require('fs');
const path = require('path');
const {runTest} = require('../esinstall-test-utils.js');

const cwd = __dirname;

describe('named-exports', () => {
  it('cjs', async () => {
    const pkg = 'cjs-named-exports-simple';
    const dest = path.join(cwd, 'test-cjs');
    await runTest([pkg], {cwd, dest});

    const output = fs.readFileSync(path.join(dest, `${pkg}.js`), 'utf8');

    // test output (note: this may be a bit too close to a snapshot, but pay attention to changes here)
    expect(output).toEqual(
      expect.stringContaining(
        `export {
  cjs_named_exports_simple_default as default,
  export1,
  export2,
  export3,
  export4,
  export5
};`,
      ),
    );
  });

  it('cjs (export obj)', async () => {
    const pkg = 'cjs-named-exports-obj';
    const dest = path.join(cwd, 'test-cjs');
    await runTest([pkg], {cwd, dest});

    const output = fs.readFileSync(path.join(dest, `${pkg}.js`), 'utf8');

    // test output
    expect(output).toEqual(
      expect.stringContaining(`export {
  cjs_named_exports_obj_default as default,
  export1,
  export2
};`),
    );
  });

  it('cjs (re-exported)', async () => {
    const pkg = 'cjs-named-exports-reexported';
    const dest = path.join(cwd, 'test-cjs-02');
    await runTest([pkg], {cwd, dest});

    const output = fs.readFileSync(path.join(dest, `${pkg}.js`), 'utf8');

    // test output
    expect(output).toEqual(
      expect.stringContaining(`export {
  cjs_named_exports_reexported_default as default,
  export42
};`),
    );
  });

  it('umd', async () => {
    const pkg = 'umd-named-exports';
    const dest = path.join(cwd, 'test-umd');
    await runTest([pkg], {cwd, dest});

    const output = fs.readFileSync(path.join(dest, `${pkg}.js`), 'utf8');

    // test output
    expect(output).toEqual(
      expect.stringContaining(`export {
  Attribute,
  Priority,
  Relation,
  SubView,
  View,
  VisualFormat,
  umd_named_exports_default as default
};`),
    );
  });
});
