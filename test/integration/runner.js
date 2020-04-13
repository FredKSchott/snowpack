const assert = require('assert');
const path = require('path');
const fs = require('fs').promises;
const {readdirSync, readFileSync} = require('fs');
const execa = require('execa');
const rimraf = require('rimraf');
const dircompare = require('dir-compare');

const KEEP_LOCKFILE = [
  'source-pika-lockfile', // We explicitly want to test the lockfile in this test
];

const SKIP_FILE_CHECK = [
  'config-rollup', // only expected-output.txt is needed for the test, and Windows comparison fails because of backslashes
  'include-ignore-unsupported-files', // no output expected
];

function stripBenchmark(stdout) {
  return stdout.replace(/\s*\[\d+\.?\d+s\](\n?)/g, '$1'); //remove benchmark
}
function stripStats(stdout) {
  return stdout.replace(/[\d\.]*? KB/g, 'XXXX KB');
}
function stripWhitespace(stdout) {
  return stdout.replace(/((\s+$)|((\\r\\n)|(\\n)))/gm, '');
}
function stripRev(code) {
  return code.replace(/\?rev=\w+/gm, '?rev=XXXXXXXXXX');
}
function stripChunkHash(stdout) {
  return stdout.replace(/([\w\-]+\-)[a-z0-9]{8}(\.js)/g, '$1XXXXXXXX$2');
}

beforeAll(() => {
  // Needed so that ora (spinner) doesn't use platform-specific characters
  process.env = Object.assign(process.env, {CI: '1'});
});

for (const testName of readdirSync(__dirname)) {
  if (testName === 'node_modules' || testName.includes('.')) {
    continue;
  }

  test(testName, async () => {
    // Prepare test directory
    const testDir = path.join(__dirname, testName);
    if (!KEEP_LOCKFILE.includes(testName)) {
      rimraf.sync(path.join(testDir, 'snowpack.lock.json'));
    }

    const {all} = await execa('npm', ['run', `TEST`, `--silent`], {
      cwd: path.join(__dirname, testName),
      reject: false,
    });
    // Test Output
    const expectedOutputLoc = path.join(__dirname, testName, 'expected-output.txt');
    const expectedOutput = await fs.readFile(expectedOutputLoc, {encoding: 'utf8'});
    assert.strictEqual(
      stripWhitespace(stripBenchmark(stripChunkHash(stripStats(all)))),
      stripWhitespace(expectedOutput),
    );

    // Test Lockfile (if one exists)
    const expectedLockLoc = path.join(__dirname, testName, 'expected-lock.json');
    const expectedLock = await fs
      .readFile(expectedLockLoc, {encoding: 'utf8'})
      .catch((/* ignore */) => null);
    if (expectedLock) {
      const actualLockLoc = path.join(__dirname, testName, 'snowpack.lock.json');
      const actualLock = await fs.readFile(actualLockLoc, {encoding: 'utf8'});
      assert.strictEqual(stripWhitespace(actualLock), stripWhitespace(expectedLock));
    }

    const expectedWebDependenciesLoc = path.join(__dirname, testName, 'expected-install');
    const actualWebDependenciesLoc = path.join(__dirname, testName, 'web_modules');
    const expectedWebDependencies = await fs.readdir(expectedWebDependenciesLoc).catch(() => {});
    if (!expectedWebDependencies) {
      // skip web_modules/ comparison for specific tests
      if (SKIP_FILE_CHECK.includes(testName)) {
        return;
      }
      // skip web_modules/ comparison for tests that start with error-*
      if (testName.startsWith('error-')) {
        return;
      }
      // throw error if web_modules/ is generated but expected-install/ is missing
      assert.rejects(() => fs.readdir(actualWebDependenciesLoc), 'web_modules/ exists');
      return;
    }

    // Test That all expected files are there
    const actualWebDependencies = await fs.readdir(actualWebDependenciesLoc);
    assert.deepEqual(actualWebDependencies, expectedWebDependencies);

    // Test That all files match
    var res = dircompare.compareSync(actualWebDependenciesLoc, expectedWebDependenciesLoc, {
      compareSize: true,
      // Chunk hashes created in common dependency file names are generated
      // differently on windows & linux and cause CI tests to fail
      excludeFilter: 'common',
    });
    // If any diffs are detected, we'll assert the difference so that we get nice output.
    res.diffSet.forEach(function(entry) {
      if (entry.type1 !== 'file') {
        // NOTE: We only compare files so that we give the test runner a more detailed diff.
        return;
      }

      return assert.strictEqual(
        stripWhitespace(
          stripChunkHash(
            stripRev(readFileSync(path.join(entry.path1, entry.name1), {encoding: 'utf8'})),
          ),
        ),
        stripWhitespace(
          stripChunkHash(
            stripRev(readFileSync(path.join(entry.path2, entry.name2), {encoding: 'utf8'})),
          ),
        ),
      );
    });
  });
}
