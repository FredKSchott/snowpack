const {parse} = require('markdown-wasm/dist/markdown.node.js');
const fs = require('fs');
module.exports = function plugin(snowpackConfig, pluginOptions = {}) {
  return {
    name: '@snowpack/plugin-markdown',
    resolve: {
      input: ['.md', '.markdown'],
      output: ['.html'],
    },
    load: ({filePath}) => {
      const markdown = fs.readFileSync(filePath, 'utf-8');
      const code = parse(markdown, pluginOptions);
      return {
        '.html': code,
      };
    },
  };
};
