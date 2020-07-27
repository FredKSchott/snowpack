const fs = require('fs');
const path = require('path');
const execa = require('execa');
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
  it('npx create-snowpack-app', async () => {
    const template = 'app-template-preact'; // any template will do

    // run the local create-snowpack-app bin
    await execa(
      'node',
      [
        './packages/create-snowpack-app',
        `./test/create-snowpack-app/test-install`,
        '--template',
        `../../../packages/@snowpack/${template}`,
        '--use-yarn', // we use Yarn for this repo
        '--force', // saves you from having to manually delete things
      ],
      {cwd: path.resolve(__dirname, '..', '..')},
    );

    // snowpack.config.json is a file we can test for to assume successful
    // install, since it’s added at the end.
    const snowpackConfigExists = fs.existsSync(
      path.resolve(__dirname, 'test-install', 'snowpack.config.json'),
    );
    expect(snowpackConfigExists).toBe(true);
  });

  // template snapshots
  templates.forEach((template) => {
    it(`--template @snowpack/${template}`, async () => {
      const cwd = path.join(TEMPLATES_DIR, template);

      // 1. build

      // pre-build: set config to minify output
      const snowpackConfig = path.join(cwd, 'snowpack.config.json');
      const originalConfig = fs.readFileSync(snowpackConfig, 'utf8');
      const config = JSON.parse(originalConfig);
      config.buildOptions = {...(config.buildOptions || {}), minify: false};
      fs.writeFileSync(snowpackConfig, JSON.stringify(config), 'utf8');

      // build
      await execa('yarn', ['build'], {cwd, env: {NODE_ENV: 'production'}});

      // post-build: restore original config
      fs.writeFileSync(snowpackConfig, originalConfig, 'utf8');

      const expected = path.join(__dirname, 'snapshots', template);
      const actual = path.join(cwd, 'build');

      // 2. compare
      const res = dircompare.compareSync(expected, actual);
      res.diffSet.forEach((entry) => {
        // NOTE: We only compare files so that we give the test runner a more detailed diff.
        if (entry.type1 !== 'file') {
          return;
        }

        // NOTE: common chunks are hashed, non-trivial to compare
        if (entry.path1.endsWith('common') && entry.path2.endsWith('common')) {
          return;
        }

        if (!entry.path2)
          throw new Error(
            `File failed to generate: ${entry.path1.replace(expected, '')}/${entry.name1}`,
          );
        if (!entry.path1)
          throw new Error(
            `File not found in snapshot: ${entry.path2.replace(actual, '')}/${entry.name2}`,
          );

        // compare contents
        const f1 = fs.readFileSync(path.join(entry.path1, entry.name1), 'utf8');
        const f2 = fs.readFileSync(path.join(entry.path2, entry.name2), 'utf8');

        expect(format(f2)).toBe(format(f1));
      });
    });
  });
});
