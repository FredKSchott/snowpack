const fs = require('fs').promises;

const rePathSlash = /([\\\/])[^\\\/]*$/;
const reAllSlashes = /[\\\/]/g;

module.exports = function (snowConf, plugOpt) {
  return {
    resolve: {
      input: ['.html'],
      output: ['.html.js']
    },
    async load({ filePath }) {
      const slash = filePath.match(rePathSlash);
      if (slash) {
        plugOpt.base = plugOpt.base.replace(reAllSlashes, slash[1]);
      }
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
