const assert = require('assert');
const path = require('path');
const fs = require('fs').promises;
const {readdirSync, readFileSync, statSync, existsSync} = require('fs');
const execa = require('execa');
const dircompare = require('dir-compare');

const STRIP_WHITESPACE = /((\s+$)|((\\r\\n)|(\\n)))/gm;
const STRIP_REV = /\?rev=\w+/gm;
const STRIP_CHUNKHASH = /([\w\-]+\-)[a-z0-9]{8}(\.js)/g;

/** format diffs to be meaningful */
function format(stdout) {
  return stdout
    .replace(STRIP_REV, '?rev=XXXXXXXXXX')
    .replace(STRIP_CHUNKHASH, '$1XXXXXXXX$2')
    .replace(STRIP_WHITESPACE, '');
}

for (const testName of readdirSync(__dirname)) {
  if (testName === 'node_modules' || testName.includes('.')) {
    continue;
  }

  test(testName, async () => {
    let cwd = path.join(__dirname, testName);

    // add exception for yarn-workspaces test
    if (testName === 'yarn-workspaces') {
      cwd = path.join(cwd, 'packages', 'snowpack');
    }

    // Run Test
    const {all} = await execa('npm', ['run', `TEST`, `--silent`], {
      env: {
        NODE_ENV: 'production',
      },
      cwd,
      reject: true,
      all: true,
    });

    const expectedBuildLoc = path.join(cwd, 'expected-build');
    const actualBuildLoc = path.join(cwd, 'build');

    const expectedBuild = await fs.readdir(expectedBuildLoc).catch(() => {});

    // Test That all expected files are there
    const actualBuild = await fs.readdir(actualBuildLoc);
    assert.deepEqual(actualBuild, expectedBuild);

    // Test That all files match
    var res = dircompare.compareSync(actualBuildLoc, expectedBuildLoc, {
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

      return assert.strictEqual(
        format(readFileSync(path.join(entry.path1, entry.name1), {encoding: 'utf8'})),
        format(readFileSync(path.join(entry.path2, entry.name2), {encoding: 'utf8'})),
      );
    });
  });
}
