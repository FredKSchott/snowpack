const fs = require('fs');
const path = require('path');
const execa = require('execa');
const rimraf = require('rimraf');
const dircompare = require('dir-compare');

const TEMPLATES_DIR = path.resolve(__dirname, '..', '..', 'packages', '@snowpack');

const templates = fs.readdirSync(TEMPLATES_DIR).filter((dir) => dir.startsWith('app-template-'));

const format = (stdout) =>
  stdout
    .replace(/([\w\-]+\-)[a-z0-9]{8}(\.js)/g, '$1XXXXXXXX$2') // strip chunk hash
    .replace(/((\s+$)|((\\r\\n)|(\\n)))/gm, '') // strip whitespace chars
    .replace(/\n\s*\/\*[^*]+\*\/\s*\n/gm, '\n'); // strip full-line comments (throws Svelte test)

describe('create-snowpack-app', () => {
  // test npx create-snowpack-app bin
  it('npx create-snowpack-app', () => {
    const template = 'app-template-preact'; // any template will do
    const installDir = path.resolve(__dirname, 'test-install');

    rimraf.sync(installDir);

    // run the local create-snowpack-app bin
    execa.sync(
      'node',
      [
        './packages/create-snowpack-app',
        `./test/create-snowpack-app/test-install`,
        '--template',
        `../../../packages/@snowpack/${template}`,
        '--use-yarn', // we use Yarn for this repo
      ],
      {cwd: path.resolve(__dirname, '..', '..')},
    );

    // snowpack.config.json is a file we can test for to assume successful
    // install, since it’s added at the end.
    const snowpackConfigExists = fs.existsSync(path.join(installDir, 'snowpack.config.json'));
    expect(snowpackConfigExists).toBe(true);
  });

  // template snapshots
  templates.forEach((template) => {
    it(template, async () => {
      const cwd = path.join(TEMPLATES_DIR, template);

      // build
      await execa('yarn', ['build', '--no-minify'], {cwd, env: {NODE_ENV: 'production'}});

      const expected = path.join(__dirname, 'snapshots', template);
      const actual = path.join(cwd, 'build');

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

        // don’t compare source map contents, so long as they exist
        if (entry.name1.endsWith('.map')) return;

        // NOTE: common chunks are hashed, non-trivial to compare
        if (entry.path1.endsWith('common') && entry.path2.endsWith('common')) {
          return;
        }

        // compare contents
        const f1 = fs.readFileSync(path.join(entry.path1, entry.name1), 'utf8');
        const f2 = fs.readFileSync(path.join(entry.path2, entry.name2), 'utf8');

        expect(format(f2)).toBe(format(f1));
      });
    });
  });
});
