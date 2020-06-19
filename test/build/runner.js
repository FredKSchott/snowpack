const assert = require('assert');
const path = require('path');
const fs = require('fs').promises;
const {readdirSync, readFileSync, statSync, existsSync} = require('fs');
const execa = require('execa');
const dircompare = require('dir-compare');

function stripWhitespace(stdout) {
  return stdout.replace(/((\s+$)|((\\r\\n)|(\\n)))/gm, '');
}
function stripRev(code) {
  return code.replace(/\?rev=\w+/gm, '?rev=XXXXXXXXXX');
}
function stripChunkHash(stdout) {
  return stdout.replace(/([\w\-]+\-)[a-z0-9]{8}(\.js)/g, '$1XXXXXXXX$2');
}

for (const testName of readdirSync(__dirname)) {
  if (testName === 'node_modules' || testName.includes('.')) {
    continue;
  }
  // TODO: not working on CI, because packages/snowpack/node_modules doesn't exist?
  if (testName === 'yarn-workspaces') {
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
