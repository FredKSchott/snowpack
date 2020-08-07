/**
 * Utility to update all build and integration snapshots
 * ⚠️ WARNING! If you do this, YOU MUST REVIEW THE DIFF!
 */
const fs = require('fs');
const {copySync} = require('fs-extra');
const path = require('path');
const execa = require('execa');
const rimraf = require('rimraf');
const {bold, dim, yellow, green} = require('kleur/colors');

function isDir(dir) {
  return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
}

const env = {
  NODE_ENV: 'test',
};

console.warn(bold(`Updating snapshots…`));
console.warn(yellow(`⚠️  You better check all the diffs!`));

function updateSnapshots() {
  const ROOT = path.join(__dirname, '..');
  const BUILD_DIR = path.join(ROOT, 'test', 'build');
  const INTEGRATION_DIR = path.join(ROOT, 'test', 'integration');
  const TEMPLATES_DIR = path.join(ROOT, 'test', 'create-snowpack-app', 'snapshots');

  // build: build -> expected-build
  fs.readdirSync(BUILD_DIR).forEach((test) => {
    const cwd = path.join(BUILD_DIR, test);
    if (!isDir(cwd)) return;
    execa.sync('yarn', ['testbuild'], {cwd, env});
    rimraf.sync(path.join(cwd, 'expected-build'));
    copySync(path.join(cwd, 'build'), path.join(cwd, 'expected-build'));
    console.log(green(`✔ Updated ${path.relative(ROOT, cwd)}`));
  });

  // integration snaps: web_modules -> expected-install
  fs.readdirSync(INTEGRATION_DIR).forEach((test) => {
    const cwd = path.join(INTEGRATION_DIR, test);
    if (!isDir(cwd)) return;
    if (!isDir(path.join(cwd, 'expected-install'))) {
      console.log(dim(`Skipped ${path.relative(ROOT, cwd)}.`));
      return;
    }

    execa.sync('yarn', ['testinstall'], {cwd, env});
    rimraf.sync(path.join(cwd, 'expected-install'));
    copySync(path.join(cwd, 'web_modules'), path.join(cwd, 'expected-install'));
    console.log(green(`✔ Updated ${path.relative(ROOT, cwd)}`));
  });

  // create-snowpack-app templates: @packages/snowpack/app-template-*/build -> test/create-snowpack-app/snapshots/*
  fs.readdirSync(TEMPLATES_DIR).forEach((template) => {
    const TEMPLATE_SRC = path.join(ROOT, 'packages', '@snowpack');
    const cwd = path.join(TEMPLATE_SRC, template);
    execa.sync('yarn', ['build', '--no-minify'], {cwd, env});
    rimraf.sync(path.join(TEMPLATES_DIR, template));
    copySync(path.join(cwd, 'build'), path.join(TEMPLATES_DIR, template));
    console.log(green(`✔ Updated ${path.relative(ROOT, path.join(TEMPLATES_DIR, template))}`));
  });
}

updateSnapshots();

console.warn(yellow(`🦄  No, seriously, check all the diffs. ♥️  I believe in you! ✨🌈`));
