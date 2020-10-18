const fs = require('fs').promises;

module.exports = function () {
  return {
    resolve: {
      input: ['.global.css'],
      output: ['.css']
    },
    async load({ filePath }) {
      return {
        '.css': await fs.readFile(filePath, 'utf-8')
      }
    },
  };
};
