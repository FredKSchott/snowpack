const fs = require('fs').promises;

module.exports = function (snowConf, plugOpt) {
  return {
    resolve: {
      input: ['.html'],
      output: ['.html.js']
    },
    async load({ filePath }) {
      var bpIndex = filePath.indexOf(plugOpt.base);
      if (-1 === bpIndex) return;
      const fileContents = await fs.readFile(filePath, 'utf-8');
      return {
        '.html.js': `
export default {
  template: ${JSON.stringify(fileContents)}
}
`
      }
    },
  };
};
