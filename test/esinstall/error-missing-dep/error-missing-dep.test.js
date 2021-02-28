const path = require('path');
const {
  existsPackageJson,
  runTest,
  testLockFile,
  testWebModules,
} = require('../esinstall-test-utils.js');

require('jest-specific-snapshot'); // allows to call expect().toMatchSpecificSnapshot(filename, snapshotName)

describe('error-missing-dep', () => {
  it('matches the snapshot', async () => {
    const cwd = __dirname;

    if (existsPackageJson(cwd) === false) return;

    // Run Test
    try {
      const {output, snapshotFile} = await runTest(['fakemodule'], {cwd});
      expect(false).toEqual(true); // should not finish
    } catch (err) {
      expect(err.message).toEqual('Package "fakemodule" not found. Have you installed it? ');
    }
  });
});
