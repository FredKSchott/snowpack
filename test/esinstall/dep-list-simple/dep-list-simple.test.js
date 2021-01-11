const path = require('path');
const {
  existsPackageJson,
  runTest,
  testLockFile,
  testWebModules,
} = require('../esinstall-test-utils.js');

require('jest-specific-snapshot'); // allows to call expect().toMatchSpecificSnapshot(filename, snapshotName)

describe('dep-list-simple', () => {
  it('matches the snapshot', async () => {
    const cwd = __dirname;

    if (existsPackageJson(cwd) === false) return;

    // Run Test
    const {output, snapshotFile} = await runTest(['async'], {cwd});

    // Test output
    expect(output).toMatchSpecificSnapshot(snapshotFile, 'cli output');

    // Test Lockfile (if one exists)
    await testLockFile(cwd);

    // Cleanup
    const {testAllSnapshots, testDiffs} = await testWebModules(cwd, snapshotFile);

    // Assert that the snapshots match
    testAllSnapshots();

    // If any diffs are detected, we'll assert the difference so that we get nice output.
    testDiffs();
  });
});
