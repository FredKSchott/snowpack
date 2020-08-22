const fs = require('fs');
const path = require('path');
const execa = require('execa');
const rimraf = require('rimraf');
const glob = require('glob');

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
      await execa('yarn', ['build', '--clean', '--no-minify'], {
        cwd,
        env: {NODE_ENV: 'production'},
      });

      const actual = path.join(cwd, 'build');
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
        const f1 = fs.readFileSync(path.resolve(actual, entry), {encoding: 'utf8'});
        expect(format(f1)).toMatchSnapshot(entry.replace(/\\/g, '/'));
      }
    });
  });
});
