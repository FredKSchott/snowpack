const rimraf = require('rimraf');
const glob = require('glob');
const path = require('path');
const fs = require('fs').promises;
const snowpack = require('snowpack');
const assert = require('assert');

const UTF8_FRIENDLY_EXTS = [
  'css',
  'html',
  'js',
  'map',
  'jsx',
  'ts',
  'tsx',
  'svelte',
  'svg',
  'vue',
  'json',
]; // only read non-binary files (add more exts here as needed)

const writeFile = (file, data) =>
  fs.mkdir(path.dirname(file), {recursive: true}).then(() => fs.writeFile(file, data));

exports.testFixture = async function testFixture(
  testFiles,
  {absolute = false, overrides = {}} = {},
) {
  const inDir = await fs.mkdtemp(path.join(__dirname, '__temp__', 'snowpack-fixture-'));

  if (typeof testFiles === 'string') {
    testFiles = {'index.js': testFiles};
  }
  for (const [fileLoc, fileContents] of Object.entries(testFiles)) {
    await writeFile(path.join(inDir, fileLoc), fileContents);
  }

  // Install any dependencies
  const hasPackageJson = testFiles['package.json'];
  hasPackageJson &&
    require('child_process').execSync('yarn', {
      cwd: inDir,
      stdio: 'ignore',
    });

  const config = await snowpack.loadConfiguration({root: inDir, ...overrides});
  const outDir = config.buildOptions.out;

  await snowpack.build({
    config,
    lockfile: null,
  });

  const result = {};
  assert(path.isAbsolute(outDir));

  const allFiles = glob.sync(`**/*.{${UTF8_FRIENDLY_EXTS.join(',')}}`, {
    cwd: outDir,
    nodir: true,
    absolute: true,
    dot: true,
  });

  for (const fileLoc of allFiles) {
    result[absolute ? fileLoc : path.relative(outDir, fileLoc)] = require('fs').readFileSync(
      fileLoc,
      'utf8',
    );
  }

  const snowpackCache = glob.sync(`.snowpack/**/*.{${UTF8_FRIENDLY_EXTS.join(',')}}`, {
    cwd: inDir,
    nodir: true,
    absolute: true,
  });

  for (const fileLoc of snowpackCache) {
    result[absolute ? fileLoc : path.relative(outDir, fileLoc)] = require('fs').readFileSync(
      fileLoc,
      'utf8',
    );
  }

  // TODO: Make it easier to turn this off when debugging.
  await rimraf.sync(inDir);
  // Return the result.
  return result;
};
