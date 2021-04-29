const path = require('path');
const fs = require('fs-extra');

function readFilesSync(dir) {
  return fs
    .readdirSync(dir)
    .map((filename) => {
      const filepath = path.resolve(dir, filename);
      const stat = fs.statSync(filepath);
      const isFile = stat.isFile();
      const content = isFile ? fs.readFileSync(filepath, 'utf-8') : null;

      if (isFile) {
        return {
          filename,
          content: normalizeContent(content),
        };
      }
    })
    .filter((file) => !!file);
}

function normalizeContent(content) {
  return content
    .toString()
    .replace(/(\\r\\n)/g, '\\n')
    .replace(/\.[a-z0-9]{20}\./g, '.XXXXXXXXXXXXXXXXXXXX.');
}

module.exports = readFilesSync;
