const fs = require('fs');
const path = require('path');
const execa = require('execa');
const rimraf = require('rimraf');
const glob = require('glob');

const TEMPLATES_DIR = path.resolve(__dirname, '..', '..', 'create-snowpack-app');
const templates = fs.readdirSync(TEMPLATES_DIR).filter((dir) => dir.startsWith('app-template-'));
const STRIP_CSS_MODULES = /_[\d\w]{5}_[\d]{1,3}/g;

const format = (stdout) =>
  stdout
    .replace(/([\w\-]+\-)[a-z0-9]{8}(\.js)/g, '$1XXXXXXXX$2') // strip chunk hash
    .replace(/((\s+$)|((\\r\\n)|(\\n)))/gm, '') // strip whitespace chars
    .replace(/\n\s*\/\*[^*]+\*\/\s*\n/gm, '\n'); // strip full-line comments (throws Svelte test)

describe('create-snowpack-app', () => {
  // Increase timeout for slow tests
  jest.setTimeout(60 * 1000);

  // test npx create-snowpack-app bin
  it('npx create-snowpack-app', () => {
    const template = 'app-template-preact'; // any template will do
    const installDir = path.resolve(__dirname, 'test-install');

    rimraf.sync(installDir);

    // run the local create-snowpack-app bin
    execa.sync(
      'node',
      [
        './create-snowpack-app/cli',
        `./test/create-snowpack-app/test-install`,
        '--template',
        `./create-snowpack-app/${template}`,
        '--use-yarn', // we use Yarn for this repo
      ],
      {cwd: path.resolve(__dirname, '..', '..')},
    );

    // snowpack.config.json is a file we can test for to assume successful
    // install, since it’s added at the end.
    const snowpackConfigExists =
      fs.existsSync(path.join(installDir, 'snowpack.config.json')) ||
      fs.existsSync(path.join(installDir, 'snowpack.config.js'));
    expect(snowpackConfigExists).toBe(true);

    // install node_modules by default
    const modulesExist = fs.existsSync(path.join(installDir, 'node_modules'));
    expect(modulesExist).toBe(true);
  });

  // test `--no-install` option
  it('npx create-snowpack-app --no-install', () => {
    const template = 'app-template-preact'; // any template will do
    const installDir = path.resolve(__dirname, 'test-install');

    rimraf.sync(installDir);

    // run the local create-snowpack-app bin
    execa.sync(
      'node',
      [
        './create-snowpack-app/cli',
        `./test/create-snowpack-app/test-install`,
        '--template',
        `./create-snowpack-app/${template}`,
        '--use-yarn', // we use Yarn for this repo
        '--no-install',
      ],
      {cwd: path.resolve(__dirname, '..', '..')},
    );

    // snowpack.config.json is a file we can test for to assume successful
    // install, since it’s added at the end.
    const snowpackConfigExists =
      fs.existsSync(path.join(installDir, 'snowpack.config.json')) ||
      fs.existsSync(path.join(installDir, 'snowpack.config.js'));
    expect(snowpackConfigExists).toBe(true);

    // install node_modules by default
    const modulesExist = fs.existsSync(path.join(installDir, 'node_modules'));
    expect(modulesExist).toBe(false);
  });

  // template snapshots
  templates.forEach((template) => {
    const cwd = path.join(TEMPLATES_DIR, template);

    it(`${template} > build`, async () => {
      await execa('yarn', ['build', '--clean'], {
        // Jest sets NODE_ENV to "test" by default, but this should be undefined in real-world use
        env: {NODE_ENV: undefined},
        cwd,
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

      expect(allFiles.map((f) => f.replace(/\\/g, '/'))).toMatchSnapshot('allFiles');

      // If any diffs are detected, we'll assert the difference so that we get nice output.
      for (const entry of allFiles) {
        if (
          entry.endsWith('.css') ||
          entry.endsWith('.html') ||
          entry.endsWith('.js') ||
          entry.endsWith('.json')
        ) {
          let f1 = fs.readFileSync(path.resolve(actual, entry), {encoding: 'utf8'});
          // Add special handling for CSS module hashes
          if (entry.includes('.module.css')) {
            f1 = f1.replace(STRIP_CSS_MODULES, '_XXXXX_XX');
          }
          expect(format(f1)).toMatchSnapshot(entry.replace(/\\/g, '/'));
        }
      }
    });

    it(`${template} > test`, async () => {
      // This template's tests just take way too long. TODO: Upgrade to @web/test-runner
      if (template === 'app-template-svelte-typescript') {
        return;
      }

      rimraf.sync(path.join(cwd, 'node_modules', '.cache'));
      const {stdout, stderr, all, exitCode} = await execa('yarn', ['test'], {
        cwd,
        // Jest sets NODE_ENV to "test" by default, but this should be undefined in real-world use
        env: {NODE_ENV: undefined},
        reject: false,
        all: true,
      });

      // Ignore templates that have no test runner installed.
      if (all.includes('This template does not include a test runner by default.')) {
        return;
      }

      // If tests didn't pass, output some relevant info into the test logs.
      if (exitCode !== 0) {
        console.error('STDOUT', stdout);
        console.error('STDERR', stderr);
      }

      expect(exitCode).toEqual(0);

      // NOTE(fks) Keeping these for future reference, more santization was needed,
      // and decision was made to just check exitCode for pass/fail.
      // expect(
      //   strpAnsi(stderr).replace(/[\d\.]+\s*m?s/g, 'XXXXXXms').replace(/((\s+$)|((\\r\\n)|(\\n)))/gm, '').replace(/Time:.*$/m, ''),
      // ).toMatchSnapshot('stderr');
    });
  });
});
