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

function generateNewChangelog(pkgFolder) {
  return `# Changelog\n\n> *For older releses, check our curated [release update thread](https://github.com/snowpackjs/snowpack/discussions/1183) or the raw [commit history](https://github.com/snowpackjs/snowpack/commits/main/${path.normalize(
    pkgFolder,
  )}).*`;
}

function generateChangelogUpdate(dir, newTag, oldTag) {
  let {stdout} = execa.sync(
    'git',
    ['log', `HEAD...${oldTag}`, `--abbrev-commit`, `--format=* %h - %s <%an>`, dir],
    {cwd: dir},
  );
  stdout = stdout.replace(/<Fred K. Schott>/g, '').replace(/<FredKSchott>/g, '');
  return `\n\n## ${newTag} [${formatDate()}]\n\n${stdout}`;
}

module.exports = function release(pkgFolder, tag, bump, skipBuild) {
  console.log(`# release(${pkgFolder}, ${tag}, ${bump})`);

  const root = path.resolve(__dirname, '..');
  const dir = path.resolve(root, pkgFolder);
  if (execa.sync('git', ['status', '--porcelain'], {cwd: dir}).stdout) {
    console.error('working directory not clean!');
    process.exit(1);
  }

  if (skipBuild !== true) {
    console.log('Building...');
    console.log(execa.sync('yarn', ['run', 'build'], {cwd: root}));
    console.log('Bundling...');
    console.log(execa.sync('yarn', ['run', 'bundle'], {cwd: root}));
  }

  console.log('Publishing...');
  const pkgJsonLoc = path.join(dir, 'package.json');
  const {name: pkgName, version: oldPkgVersion} = JSON.parse(fs.readFileSync(pkgJsonLoc, 'utf8'));
  const oldPkgTag = `${pkgName}@${oldPkgVersion}`;
  console.log(execa.sync('npm', ['version', bump], {cwd: dir}));
  const {version: newPkgVersion} = JSON.parse(fs.readFileSync(pkgJsonLoc, 'utf8'));
  const newPkgTag = `${pkgName}@${newPkgVersion}`;

  if (!pkgFolder.startsWith('create-snowpack-app/')) {
    const changelogLoc = path.join(dir, 'CHANGELOG.md');
    let changelog = '';
    try {
      changelog = fs.readFileSync(changelogLoc, 'utf8');
    } catch (err) {
      changelog = generateNewChangelog(pkgFolder);
    }
    changelog += generateChangelogUpdate(dir, newPkgTag, oldPkgTag);
    fs.writeFileSync(changelogLoc, changelog);
  }

  console.log(execa.sync('git', ['add', '-A'], {cwd: dir}));
  console.log(execa.sync('git', ['commit', '-m', newPkgTag], {cwd: dir}));
  console.log(execa.sync('git', ['tag', newPkgTag], {cwd: dir}));
  console.log(execa.sync('npm', ['publish', '--tag', tag], {cwd: dir}));
  console.log(execa.sync('git', ['push', 'origin', 'main'], {cwd: dir}));
  console.log(execa.sync('git', ['push', '--tags'], {cwd: dir}));
};
