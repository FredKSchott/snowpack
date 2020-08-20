const fs = require('fs');
const path = require('path');
const execa = require('execa');
const rimraf = require('rimraf');
const dircompare = require('dir-compare');

const TEMPLATES_DIR = __dirname //path.resolve(__dirname, 'integration');

const templates = fs.readdirSync(TEMPLATES_DIR).filter((dir) => dir.startsWith('app-'));

const format = (stdout) =>
  stdout
    .replace(/([\w\-]+\-)[a-z0-9]{8}(\.js)/g, '$1XXXXXXXX$2') // strip chunk hash
    .replace(/((\s+$)|((\\r\\n)|(\\n)))/gm, '') // strip whitespace chars
    .replace(/\n\s*\/\*[^*]+\*\/\s*\n/gm, '\n'); // strip full-line comments (throws Svelte test)

describe('@snowpack/plugin-workbox', () => {

  // template snapshots
  templates.forEach((template) => {
    it(template, async () => {
      const cwd = path.join(TEMPLATES_DIR, template);

      // install
      await execa('yarn', ['--force'], {
        cwd,
        env: {NODE_ENV: 'production'},
      });

      // build
      await execa('yarn', ['build', '--clean', '--no-minify'], {
        cwd,
        env: {NODE_ENV: 'production'},
      });

      const expected = path.join(__dirname, '__snapshots__', template);
      const actual = path.join(cwd, 'build');

      if (process.env.UPDATE_SNAPSHOTS) {
        rimraf.sync(expected);
        fs.renameSync(actual, expected);
        return;
      }

      // 2. compare
      const res = dircompare.compareSync(expected, actual);

      res.diffSet.forEach((entry) => {
        // NOTE: We only compare files so that we give the test runner a more detailed diff.
        if (entry.type1 === 'directory' && entry.type2 === 'directory') {
          return;
        }

        if (!entry.path2 || !entry.name2)
          throw new Error(
            `File failed to generate: ${entry.path1.replace(expected, '')}/${entry.name1}`,
          );
        if (!entry.path1 || !entry.name1)
          throw new Error(
            `File not found in snapshot: ${entry.path2.replace(actual, '')}/${entry.name2}`,
          );

        // don’t compare source .map contents, so long as they exist
        if (path.extname(entry.name1) === '.map') return;

        // NOTE: common chunks are hashed, non-trivial to compare
        if (entry.path1.endsWith('common') && entry.path2.endsWith('common')) {
          return;
        }

        // compare contents
        const f1 = fs.readFileSync(path.join(entry.path1, entry.name1), 'utf-8');
        const f2 = fs.readFileSync(path.join(entry.path2, entry.name2), 'utf-8');

        expect(format(f2)).toBe(format(f1));
      });
    });
  });
});
