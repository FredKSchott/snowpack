const path = require('path');
const execa = require('execa');
const {readdirSync, readFileSync, statSync, existsSync} = require('fs');
const glob = require('glob');
const os = require('os');

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
      const cwd = path.join(__dirname, testName);
      if (!existsSync(path.join(cwd, 'package.json'))) {
        console.error(testName, 'no longer exists, skipping...');
        return;
      }

      // build test
      const capitalize = testName === 'entrypoint-ids' && os.platform() === 'win32';
      execa.sync('yarn', ['testbuild'], {cwd: capitalize ? cwd.toUpperCase() : cwd});
      const actual =
        testName === 'config-out' ? path.join(cwd, 'TEST_BUILD_OUT') : path.join(cwd, 'build');

      // Test That all files match
      const allFiles = glob.sync(`**/*`, {
        ignore: ['**/common/**/*'],
        cwd: actual,
        nodir: true,
      });

      if (allFiles.length === 0) {
        throw new Error('Empty build directory!');
      }

      expect(allFiles.map((f) => f.replace(/\\/g, '/'))).toMatchSnapshot('allFiles');

      // If any diffs are detected, we'll assert the difference so that we get nice output.
      for (const entry of allFiles) {
        if (
          entry.endsWith('.css') ||
          entry.endsWith('.html') ||
          entry.endsWith('.js') ||
          entry.endsWith('.json')
        ) {
          const f1 = readFileSync(path.resolve(actual, entry), {encoding: 'utf8'});
          expect(format(f1)).toMatchSnapshot(entry.replace(/\\/g, '/'));
        }
      }
    });
  }
});
