const fs = require('fs').promises;

module.exports = function () {
  return {
    resolve: {
      input: ['.partial.html'],
      output: ['.partial.html.js']
    },
    async load({ filePath }) {
      const fileContents = await fs.readFile(filePath, 'utf-8');
      return {
        '.partial.html.js': `
export default ${JSON.stringify(fileContents)}
`
      }
    },
  };
};
