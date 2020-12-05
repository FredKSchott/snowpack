const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

/** setup for /tests/build/* */
function setupBuildTest(cwd) {
  execSync('yarn testbuild', {cwd});
}
exports.setupBuildTest = setupBuildTest;

/** take an array of files, return contents of files (won’t read entire directory for performance) */
function readFiles(files, {cwd}) {
  if (!cwd) throw new Error(`cwd option missing, ex: readFiles(files, { cwd: __dirname })`);

  const contents = {};
  (Array.isArray(files) ? files : [files]).forEach((f) => {
    const relativePath = f.replace(/^\/?/, '/');
    const filepath = path.join(cwd, ...f.split('/'));
    contents[relativePath] = fs.readFileSync(filepath, 'utf-8');
  });
  return contents;
}
exports.readFiles = readFiles;
