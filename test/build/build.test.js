const path = require('path');
const execa = require('execa');
const {readdirSync, readFileSync, statSync, existsSync} = require('fs');
const glob = require('glob');

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
    if (testName === 'node_modules' || testName === '__snapshots__' || testName.includes('.')) {
      continue;
    }

    it(testName, () => {
      let cwd = path.join(__dirname, testName);

      // build test
      execa.sync('yarn', ['testbuild'], {cwd});
      const actual = testName === 'config-out' ? path.join(cwd, 'TEST_BUILD_OUT') : path.join(cwd, 'build');

      // Test That all files match
      const allFiles = glob.sync(`**/*`, {
        ignore: ['**/common/**/*'],
        cwd: actual,
        nodir: true,
      });

      if (allFiles.length === 0) {
        throw new Error('Empty build directory!');
      }

      expect(allFiles.map(f => f.replace(/\\/g, '/'))).toMatchSnapshot('allFiles');

      // If any diffs are detected, we'll assert the difference so that we get nice output.
      for (const entry of allFiles) {
        // don’t compare CSS or .map files.
        if (entry.endsWith('.css') || entry.endsWith('.map')) {
          continue;
        }
        const f1 = readFileSync(path.resolve(actual, entry), {encoding: 'utf8'});
        expect(format(f1)).toMatchSnapshot(entry.replace(/\\/g, '/'));
      }
    });
  }
});
