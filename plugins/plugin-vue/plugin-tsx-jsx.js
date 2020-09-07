const fs = require('fs');
const scriptCompilers = require('./src/script-compilers');

module.exports = function plugin(snowpackConfig, pluginOptions) {
  return {
    name: '@snowpack/plugin-vue-tsx-jsx',
    resolve: {
      input: ['.tsx', '.jsx'],
      output: ['.js'],
    },
    async load({filePath, fileExt}) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lang = fileExt.slice(fileExt.lastIndexOf('.') + 1);
      const result = scriptCompilers.esbuildCompile(content, lang);
      return result;
    },
  };
};
