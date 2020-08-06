const path = require('path');
const execa = require('execa');
const {readdirSync, readFileSync, statSync, existsSync} = require('fs');
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

describe('snowpack build', () => {
  for (const testName of readdirSync(__dirname)) {
    if (testName === 'node_modules' || testName.includes('.')) {
      continue;
    }

    it(testName, () => {
      let cwd = path.join(__dirname, testName);

      // build test
      execa.sync('yarn', ['testbuild'], {cwd});

      const expected = path.join(cwd, 'expected-build');
      const actual = path.join(cwd, 'build');

      // Test That all files match
      var res = dircompare.compareSync(expected, actual, {
        compareSize: true,
        // Chunk hashes created in common dependency file names are generated
        // differently on windows & linux and cause CI tests to fail
        excludeFilter: 'common',
      });

      // If any diffs are detected, we'll assert the difference so that we get nice output.
      for (const entry of res.diffSet) {
        // NOTE: We only compare files so that we give the test runner a more detailed diff.
        if (entry.type1 === 'directory' && entry.type2 === 'directory') {
          continue;
        }

        if (!entry.path2)
          throw new Error(
            `File failed to generate: ${entry.path1.replace(expected, '')}/${entry.name1}`,
          );
        if (!entry.path1)
          throw new Error(
            `File not found in snapshot: ${entry.path2.replace(actual, '')}/${entry.name2}`,
          );

        // don’t compare CSS or .map files.
        if (entry.name1.endsWith('.css') || entry.name1.endsWith('.map')) continue;

        // NOTE: common chunks are hashed, non-trivial to compare
        if (entry.path1.endsWith('common') && entry.path2.endsWith('common')) {
          continue;
        }

        const f1 = readFileSync(path.join(entry.path1, entry.name1), {encoding: 'utf8'});
        const f2 = readFileSync(path.join(entry.path2, entry.name2), {encoding: 'utf8'});

        expect(format(f1)).toBe(format(f2));
      }
    });
  }
});
