const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const glob = require('glob');

const STRIP_CHUNKHASH = /([\w\-]+\-)[a-z0-9]{8}(\.js)/g;
const STRIP_REV = /\?rev=\w+/gm;
const STRIP_WHITESPACE = /((\s+$)|((\\r\\n)|(\\n)))/gm;
const UTF8_FRIENDLY_EXTS = ['css', 'html', 'js', 'jsx', 'ts', 'tsx', 'svelte', 'svg', 'vue']; // only read non-binary files (add more exts here as needed)

/** setup for /tests/build/* */
function setupBuildTest(cwd) {
  return execSync('yarn testbuild', {cwd});
}
exports.setupBuildTest = setupBuildTest;

/** read a directory of files */
function readFiles(directory, {ignore} = {}) {
  if (!directory) throw new Error(`must specify directory`);

  const contents = {};
  const allFiles = glob.sync(`**/*.{${UTF8_FRIENDLY_EXTS.join(',')}}`, {
    cwd: directory,
    nodir: true,
    ignore,
  });

  allFiles.forEach((filepath) => {
    const relativePath = filepath.replace(/^\/?/, '/');
    contents[relativePath] = fs.readFileSync(path.join(directory, filepath), 'utf8');
  });

  return contents;
}
exports.readFiles = readFiles;

/** strip chunk hash from URLs */
function stripChunkhash(code) {
  return code.replace(STRIP_CHUNKHASH, '$1XXXXXXXX$2');
}
exports.stripChunkhash = stripChunkhash;

/** strip ?rev= from URLs */
function stripRev(code) {
  return code.replace(STRIP_REV, '?rev=XXXXXXXXXX');
}
exports.stripRev = stripRev;

/** strip whitespace */
function stripWS(code) {
  return code.replace(STRIP_WHITESPACE, '');
}
exports.stripWS = stripWS;
