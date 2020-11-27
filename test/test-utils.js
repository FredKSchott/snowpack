const fs = require('fs');

/** read a file, and split into lines */
function fileLines(fileloc) {
  return [undefined, ...fs.readFileSync(fileloc, 'utf-8').split('\n')]; // insert empty 0 key to match line numbers
}
exports.fileLines = fileLines;
