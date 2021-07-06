const fs = require('fs');
const path = require('path');
const execa = require('execa');

function formatDate() {
  var d = new Date(),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}

module.exports = function release(pkgFolder, tag, skipBuild) {
  console.log(`# release(${pkgFolder}, ${tag})`);

  const root = path.resolve(__dirname, '..');
  const dir = path.resolve(root, pkgFolder);
  if (execa.sync('git', ['status', '--porcelain'], {cwd: dir}).stdout) {
    console.error('working directory not clean!');
    process.exit(1);
  }

  if (skipBuild !== true) {
    console.log('Building...');
    console.log(execa.sync('yarn', ['run', 'build'], {cwd: root}));
  }

  console.log('Publishing...');
  const pkgJsonLoc = path.join(dir, 'package.json');
  if (!pkgFolder.startsWith('create-snowpack-app/')) {
    execa.sync('yarn', ['changeset', 'version']);
  }
  const {name: pkgName, version: newPkgVersion} = JSON.parse(fs.readFileSync(pkgJsonLoc, 'utf8'));
  const newPkgTag = `${pkgName}@${newPkgVersion}`;

  console.log(execa.sync('git', ['add', '-A'], {cwd: dir}));
  console.log(execa.sync('git', ['commit', '-m', `[skip ci] ${newPkgTag}`], {cwd: dir}));
  console.log(execa.sync('git', ['tag', newPkgTag], {cwd: dir}));
  if (pkgName === 'snowpack')
    console.log(execa.sync('git', ['tag', `v${newPkgVersion}`], {cwd: dir})); // 'snowpack' only: also tag as vX.X.X (for GitHub releases)
  console.log(execa.sync('npm', ['publish', '--tag', tag], {cwd: dir}));

  // Only push to github on latest release, since a pre-release will break
  // yarns ability to link workspaces (ex: ^3.0.0 doesn't match 3.1.0-pre.1).
  if (tag === 'latest') {
    console.log(execa.sync('git', ['push', 'origin', 'main'], {cwd: dir}));
    console.log(execa.sync('git', ['push', '--tags'], {cwd: dir}));
  }
};
