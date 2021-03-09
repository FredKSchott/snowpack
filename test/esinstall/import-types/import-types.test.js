const path = require('path');
const {runTest} = require('../esinstall-test-utils.js');

describe('importing types', () => {
  it('generates an error', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-types-only');

    // Run Test
    try {
      await runTest(['type-only-pkg', 'array-flatten'], {cwd, dest});
      expect(false).toEqual(true); // should not finish
    } catch (err) {
      expect(err.message).toContain('Unable to find any entrypoint for \"type-only-pkg\"');
    }
  });
});
