const fs = require("fs");
const hashsum = require("hash-sum");
const compiler = require("@vue/compiler-sfc");

module.exports = function plugin(config, pluginOptions) {
  return {
    defaultBuildScript: "build:vue",
    async build({ contents, filePath }) {
      const id = hashsum(filePath);
      const { descriptor, errors } = compiler.parse(contents, {
        filename: filePath,
      });

      if (errors && errors.length > 0) {
        console.error(JSON.stringify(errors));
      }

      let jsResult = "";
      if (descriptor.script) {
        jsResult += descriptor.script.content.replace(
          `export default`,
          "const defaultExport ="
        );
      } else {
        jsResult += `const defaultExport = {};`;
      }

      let cssResult;
      for (const stylePart of descriptor.styles) {
        const styleCode = await compiler.compileStyleAsync({
          filename: filePath,
          source: stylePart.content,
          id: `data-v-${id}`,
          scoped: stylePart.scoped != null,
          modules: stylePart.module != null,
          preprocessLang: stylePart.lang,
          // preprocessCustomRequire: (id: string) => require(resolve(root, id))
          // TODO load postcss config if present
        });
        if (styleCode.errors && styleCode.errors.length > 0) {
          console.error(JSON.stringify(styleCode.errors));
        }
        cssResult = cssResult || "";
        cssResult += styleCode.code;
      }

      if (descriptor.template) {
        const templateCode = compiler.compileTemplate({
          filename: filePath,
          source: descriptor.template.content,
          preprocessLang: descriptor.template.lang,
          compilerOptions: {
            scopeId: descriptor.styles.some((s) => s.scoped)
              ? `data-v-${id}`
              : null,
            runtimeModuleName: "/web_modules/vue.js",
          },
        });
        if (templateCode.errors && templateCode.errors.length > 0) {
          console.error(JSON.stringify(templateCode.errors));
        }
        jsResult += `\n${templateCode.code}\n`;
        jsResult += `\ndefaultExport.render = render`;
        jsResult += `\nexport default defaultExport`;
      }

      return { result: jsResult, resources: { css: cssResult } };
    },
  };
};
