const path = require('path');
const execa = require('execa');
const {readdirSync, readFileSync, statSync, existsSync} = require('fs');
const glob = require('glob');
const os = require('os');

require('jest-specific-snapshot'); // allows to call expect().toMatchSpecificSnapshot(filename, snapshotName)

const STRIP_WHITESPACE = /((\s+$)|((\\r\\n)|(\\n)))/gm;
const STRIP_REV = /\?rev=\w+/gm;
const STRIP_CHUNKHASH = /([\w\-]+\-)[a-z0-9]{8}(\.js)/g;
const STRIP_ROOTDIR = /"[^"]+([\/\\]+snowpack[\/\\]+test[\/\\]+)(.+?)"/g;

/** format diffs to be meaningful */
function format(stdout) {
  return stdout
    .replace(STRIP_REV, '?rev=XXXXXXXXXX')
    .replace(STRIP_CHUNKHASH, '$1XXXXXXXX$2')
    .replace(STRIP_WHITESPACE, '')
    .replace(STRIP_ROOTDIR, (_, p1, p2) => {
      return `/HOME${(p1 + p2).replace(/\\{1,2}/g, '/')}`;
    });
}

describe('snowpack build', () => {
  for (const testName of readdirSync(__dirname)) {
    if (testName === 'node_modules' || testName === '__snapshots__' || testName.includes('.')) {
      continue;
    }

    // CSS Modules generate differently on Windows; skip that only for Windows (but test in Unix still)
    if (testName === 'preload-css' && os.platform() === 'win32') continue;

    it(testName, () => {
      const cwd = path.join(__dirname, testName);
      const relativePath = cwd.replace(process.cwd() + '/', '');

      if (!existsSync(path.join(cwd, 'package.json'))) {
        console.warn(
          '%s folder has no package.json file, it is likely a leftover folder from a deleted test. You can remove the folder with `git clean -xdf %s`',
          relativePath,
          relativePath,
        );

        return;
      }

      // build test
      const capitalize = testName === 'entrypoint-ids' && os.platform() === 'win32';
      execa.sync('yarn', ['testbuild'], {cwd: capitalize ? cwd.toUpperCase() : cwd});
      const actual = testName.startsWith('config-out')
        ? path.join(cwd, 'TEST_BUILD_OUT')
        : path.join(cwd, 'build');

      // Test That all files match
      const allFiles = glob.sync(`**/*`, {
        ignore: ['**/common/**/*'],
        cwd: actual,
        nodir: true,
      });

      if (allFiles.length === 0) {
        throw new Error('Empty build directory!');
      }

      const snapshotFile = path.join(cwd, '__snapshots__');
      expect(allFiles.map((f) => f.replace(/\\/g, '/'))).toMatchSpecificSnapshot(
        snapshotFile,
        'allFiles',
      );

      // If any diffs are detected, we'll assert the difference so that we get nice output.
      for (const entry of allFiles) {
        if (
          entry.endsWith('.css') ||
          entry.endsWith('.html') ||
          entry.endsWith('.js') ||
          entry.endsWith('.json') ||
          entry.endsWith('.map')
        ) {
          const f1 = readFileSync(path.resolve(actual, entry), {encoding: 'utf8'});
          expect(format(f1)).toMatchSpecificSnapshot(
            snapshotFile,
            `build/${entry.replace(/\\/g, '/')}`,
          );
        }
      }
    });
  }
});
