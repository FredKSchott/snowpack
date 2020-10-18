const fs = require('fs').promises;

module.exports = function () {
  return {
    resolve: {
      input: ['.css'],
      output: ['.cssModule.js']
    },
    async load({ filePath }) {
      const fileContents = await fs.readFile(filePath, 'utf-8');
      return {
        '.cssModule.js': { code: `
export default {
  styles: ${JSON.stringify(fileContents)}
}
`}
      }
    }
  };
};
