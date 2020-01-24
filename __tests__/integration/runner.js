const assert = require('assert');
const path = require('path');
const fs = require('fs').promises;
const {readdirSync, readFileSync} = require('fs');
const execa = require('execa');
const dircompare = require('dir-compare');

function stripBenchmark(stdout) {
  return stdout.replace(/\s*\[\d+\.?\d+s\](\n?)/g, '$1'); //remove benchmark
}
function stripWhitespace(stdout) {
  return stdout.replace(/\s+$/gm, '');
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
    const {all} = await execa('npm', ['run', `TEST`, `--silent`], {
      cwd: path.join(__dirname, testName),
      reject: false,
    });
    // Test Output
    const expectedOutputLoc = path.join(__dirname, testName, 'expected-output.txt');
    const expectedOutput = await fs.readFile(expectedOutputLoc, {encoding: 'utf8'});
    assert.strictEqual(stripWhitespace(stripBenchmark(all)), stripWhitespace(expectedOutput));

    const expectedWebDependenciesLoc = path.join(__dirname, testName, 'expected-install');
    const actualWebDependenciesLoc = path.join(__dirname, testName, 'web_modules');
    const expectedWebDependencies = await fs.readdir(expectedWebDependenciesLoc).catch(() => {});
    if (!expectedWebDependencies) {
      assert.rejects(() => fs.readdir(actualWebDependenciesLoc), 'web_modules/ exists');
      return;
    }

    // Test That all expected files are there
    const actualWebDependencies = await fs.readdir(actualWebDependenciesLoc);
    assert.deepEqual(actualWebDependencies, expectedWebDependencies);

    // Test That all files match
    var res = dircompare.compareSync(actualWebDependenciesLoc, expectedWebDependenciesLoc, {
      compareSize: true,
    });
    // If any diffs are detected, we'll assert the difference so that we get nice output.
    res.diffSet.forEach(function(entry) {
      if (entry.type1 !== 'file') {
        // NOTE: We only compare files so that we give the test runner a more detailed diff.
        return;
      }
      return assert.strictEqual(
        stripWhitespace(readFileSync(path.join(entry.path1, entry.name1), {encoding: 'utf8'})),
        stripWhitespace(readFileSync(path.join(entry.path2, entry.name2), {encoding: 'utf8'})),
      );
    });
  });
}
