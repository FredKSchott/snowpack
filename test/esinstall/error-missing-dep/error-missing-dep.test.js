const path = require('path');
const {
  existsPackageJson,
  runTest,
  testLockFile,
  testWebModules,
} = require('../esinstall-test-utils.js');

require('jest-specific-snapshot'); // allows to call expect().toMatchSpecificSnapshot(filename, snapshotName)

describe('error-missing-dep', () => {
  beforeAll(() => {
    // Needed so that ora (spinner) doesn't use platform-specific characters
    process.env.CI = '1';
  });

  it('matches the snapshot', async () => {
    const cwd = __dirname;

    if (existsPackageJson(cwd) === false) return;

    // Run Test
    const {output, snapshotFile} = await runTest(cwd);

    // Test output
    expect(output).toMatchSpecificSnapshot(snapshotFile, 'cli output');

    // Test Lockfile (if one exists)
    await testLockFile(cwd);

    // Cleanup
    const {testAllSnapshots, testDiffs} = testWebModules(cwd, snapshotFile, {
      throwIfNoWebModules: false,
    });

    // Assert that the snapshots match
    testAllSnapshots();

    // If any diffs are detected, we'll assert the difference so that we get nice output.
    testDiffs();
  });
});
