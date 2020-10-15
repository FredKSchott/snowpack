const nunjucks = require('nunjucks');
const fs = require('fs');
module.exports = function plugin(snowpackConfig, pluginOptions = {}) {
  return {
    name: '@snowpack/plugin-markdown',
    resolve: {
      input: ['.njk'],
      output: ['.html'],
    },
    load: ({filePath}) => {
      const file = fs.readFileSync(filePath, 'utf-8');
      nunjucks.configure('views', {autoescape: true});
      const code = nunjucks.renderString(file);
      return {
        '.html': code,
      };
    },
  };
};
