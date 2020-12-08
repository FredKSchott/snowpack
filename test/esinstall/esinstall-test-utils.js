const {readFileSync, existsSync} = require('fs');
const fs = require('fs').promises;
const glob = require('glob');
const path = require('path');
const {
  setupEsinstallTest,
  stripEverything,
  stripLockfile,
  stripWhitespace,
  stripSvelteComment,
  stripChunkHash,
  stripRev,
} = require('../test-utils.js');

function existsPackageJson(cwd) {
  if (!existsSync(path.join(cwd, 'package.json'))) {
    const relativePath = cwd.replace(process.cwd() + '/', '');

    console.warn(
      '%s folder has no package.json file, it is likely a leftover folder from a deleted test. You can remove the folder with `git clean -xdf %s`',
      relativePath,
      relativePath,
    );

    return false;
  }
  return true;
}
exports.existsPackageJson = existsPackageJson;

async function runTest(cwd) {
  const {all} = await setupEsinstallTest(cwd);
  const actualOutput = stripEverything(all);

  const snapshotFile = path.join(cwd, '__snapshots__'); // `jest-specific-snapshot` cannot use the .snap extension, since it conflicts with jest

  return {
    output: actualOutput,
    snapshotFile,
  };
}
exports.runTest = runTest;

async function testLockFile(cwd) {
  const expectedLockLoc = path.join(cwd, 'expected-lock.json');
  const expectedLock = await fs
    .readFile(expectedLockLoc, {encoding: 'utf8'})
    .catch((/* ignore */) => null);
  if (expectedLock) {
    const actualLockLoc = path.join(__dirname, 'snowpack.lock.json');
    const actualLock = await fs.readFile(actualLockLoc, {encoding: 'utf8'});

    expect(stripLockfile(actualLock)).toBe(stripLockfile(expectedLock));
  }
}
exports.testLockFile = testLockFile;

const defaultWebModulesTestOptions = {throwIfNoWebModules: true};
function testWebModules(cwd, snapshotFile, {throwIfNoWebModules} = defaultWebModulesTestOptions) {
  const actual = path.join(cwd, 'web_modules');
  const allFiles = glob.sync(`**/*`, {
    ignore: ['**/common/**/*'],
    cwd: actual,
    nodir: true,
  });

  if (allFiles.length === 0 && throwIfNoWebModules) {
    throw new Error('Empty build directory!');
  }

  return {
    testAllSnapshots() {
      expect(allFiles.map((f) => f.replace(/\\/g, '/'))).toMatchSpecificSnapshot(
        snapshotFile,
        'allFiles',
      );
    },
    testDiffs() {
      // If any diffs are detected, we'll assert the difference so that we get nice output.
      for (const entry of allFiles) {
        // don’t compare CSS or .map files.
        if (entry.endsWith('.css') || entry.endsWith('.map')) {
          continue;
        }
        const f1 = readFileSync(path.resolve(actual, entry), {encoding: 'utf8'});
        expect(
          stripWhitespace(stripSvelteComment(stripChunkHash(stripRev(f1)))),
        ).toMatchSpecificSnapshot(snapshotFile, `web_modules/${entry.replace(/\\/g, '/')}`);
      }
    },
  };
}
exports.testWebModules = testWebModules;
