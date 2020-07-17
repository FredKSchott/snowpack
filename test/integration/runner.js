const assert = require('assert');
const path = require('path');
const fs = require('fs').promises;
const {readdirSync, readFileSync, statSync, existsSync} = require('fs');
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
  // Need to strip leading whitespace to get around strange Node v13 behavior
  return stdout.replace(/\s+[\d\.]*? KB/g, '    XXXX KB');
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
function stripUrlHash(stdout) {
  return stdout.replace(/\-[A-Za-z0-9]{20}\//g, 'XXXXXXXX');
}
function stripConfigErrorPath(stdout) {
  return stdout.replace(/^! (.*)package\.json$/gm, '! XXX/package.json');
}
function stripResolveErrorPath(stdout) {
  return stdout.replace(/" via "(.*)"/g, '" via "XXX"');
}
function stripAnsiEscapes(stdout) {
  return stdout.replace(
    /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~]))/g,
    '',
  );
}

function removeLockfile(testName) {
  const lockfileLoc = path.join(__dirname, testName, 'snowpack.lock.json');
  try {
    rimraf.sync(lockfileLoc);
  } catch (err) {
    // ignore
  }
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
    // Cleanup
    if (!KEEP_LOCKFILE.includes(testName)) {
      removeLockfile(testName);
    }

    // Run Test
    const {all} = await execa('npm', ['run', `TEST`, `--silent`], {
      cwd: path.join(__dirname, testName),
      reject: false,
      all: true,
    });
    // Test Output
    let expectedOutputLoc = path.join(__dirname, testName, 'expected-output.txt');
    if (process.platform === 'win32') {
      const expectedWinOutputLoc = path.resolve(expectedOutputLoc, '../expected-output.win.txt');
      if (existsSync(expectedWinOutputLoc)) {
        expectedOutputLoc = expectedWinOutputLoc;
      }
    }
    const expectedOutput = await fs.readFile(expectedOutputLoc, {encoding: 'utf8'});
    assert.strictEqual(
      stripWhitespace(
        stripConfigErrorPath(
          stripResolveErrorPath(stripBenchmark(stripChunkHash(stripStats(stripAnsiEscapes(all))))),
        ),
      ),
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
      if (KEEP_LOCKFILE.includes(testName)) {
        assert.strictEqual(stripWhitespace(actualLock), stripWhitespace(expectedLock));
      } else {
        assert.strictEqual(
          stripWhitespace(stripUrlHash(actualLock)),
          stripWhitespace(stripUrlHash(expectedLock)),
        );
      }
    }
    // Cleanup
    if (!KEEP_LOCKFILE.includes(testName)) {
      removeLockfile(testName);
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
      assert.throws(() => {
        statSync(actualWebDependenciesLoc);
      }, actualWebDependenciesLoc + ' exists');
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
    res.diffSet.forEach((entry) => {
      // NOTE: We only compare files so that we give the test runner a more detailed diff.
      if (entry.type1 !== 'file') {
        return;
      }
      // NOTE: common chunks are hashed, non-trivial to compare
      if (entry.path1.endsWith('common') && entry.path2.endsWith('common')) {
        return;
      }

      const f1 = readFileSync(path.join(entry.path1, entry.name1), {encoding: 'utf8'});
      const f2 = readFileSync(path.join(entry.path2, entry.name2), {encoding: 'utf8'});

      return assert.strictEqual(
        stripWhitespace(stripChunkHash(stripRev(f1))),
        stripWhitespace(stripChunkHash(stripRev(f2))),
      );
    });
  });
}
