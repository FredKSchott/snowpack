const fs = require('fs');
const hashsum = require('hash-sum');
const compiler = require('@vue/compiler-sfc');

module.exports = function plugin(snowpackConfig, pluginOptions = {}) {
  return {
    name: '@snowpack/plugin-vue',
    resolve: {
      input: ['.vue'],
      output: ['.js', '.css'],
    },
    async load({filePath}) {
      const {sourceMaps = true} = pluginOptions;

      const id = hashsum(filePath);
      const contents = fs.readFileSync(filePath, 'utf-8');
      const {descriptor, errors} = compiler.parse(contents, {filename: filePath});

      if (errors && errors.length > 0) {
        console.error(JSON.stringify(errors));
      }

      const output = {
        '.js': {code: '', map: ''},
        '.css': {code: '', map: ''},
      };

      if (descriptor.script) {
        output['.js'].code += descriptor.script.content.replace(
          `export default`,
          'const defaultExport =',
        );
      } else {
        output['.js'].code += `const defaultExport = {};`;
      }

      await Promise.all(
        descriptor.styles.map((stylePart) => {
          const css = compiler.compileStyle({
            filename: filePath,
            source: stylePart.content,
            id: `data-v-${id}`,
            scoped: stylePart.scoped != null,
            modules: stylePart.module != null,
            preprocessLang: stylePart.lang,
            // preprocessCustomRequire: (id: string) => require(resolve(root, id))
            // TODO load postcss config if present
          });
          if (css.errors && css.errors.length > 0) {
            console.error(JSON.stringify(css.errors));
          }
          output['.css'].code += css.code;
          if (sourceMaps && css.map) output['.css'].map += JSON.stringify(css.map);
        }),
      );

      if (descriptor.template) {
        const js = compiler.compileTemplate({
          filename: filePath,
          source: descriptor.template.content,
          preprocessLang: descriptor.template.lang,
          compilerOptions: {
            scopeId: descriptor.styles.some((s) => s.scoped) ? `data-v-${id}` : null,
            runtimeModuleName: '/web_modules/vue.js',
          },
        });
        if (js.errors && js.errors.length > 0) {
          console.error(JSON.stringify(js.errors));
        }
        output['.js'].code += `\n${js.code}\n`;
        output['.js'].code += `\ndefaultExport.render = render`;
        output['.js'].code += `\nexport default defaultExport`;

        if (sourceMaps && js.map) output['.js'].map += JSON.stringify(js.map);
      }

      return output;
    },
  };
};
