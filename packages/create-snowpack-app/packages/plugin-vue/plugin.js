const fs = require("fs");
const hashsum = require("hash-sum");
const compiler = require("@vue/compiler-sfc");

exports.build = async function build(fileLoc) {
  const id = hashsum(fileLoc);
  const fileSource = fs.readFileSync(fileLoc, { encoding: "utf-8" });
  const { descriptor, errors } = compiler.parse(fileSource, {
    filename: fileLoc,
  });

  if (errors && errors.length > 0) {
    console.error(JSON.stringify(errors));
  }

  let result = "";
  if (descriptor.script) {
    result += descriptor.script.content.replace(
      `export default`,
      "const defaultExport ="
    );
  } else {
    result += `const defaultExport = {};`;
  }
  for (const stylePart of descriptor.styles) {
    const styleCode = await compiler.compileStyleAsync({
      filename: fileLoc,
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

    result += `\n(() => {
  const styleEl = document.createElement("style");
  styleEl.type = "text/css";
  styleEl.appendChild(document.createTextNode(${JSON.stringify(
    styleCode.code
  )}));
  document.head.appendChild(styleEl);
})()\n`;
  }

  for (const templatePart of [descriptor.template]) {
    const templateCode = compiler.compileTemplate({
      filename: fileLoc,
      source: templatePart.content,
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

    result += `\n${templateCode.code}\n`;
    result += `\ndefaultExport.render = render`;
  }
  result += `\nexport default defaultExport`;
  return { result };
};
