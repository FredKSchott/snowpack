const path = require("path");
const babelParser = require("@babel/parser");

// function importCSZ() {
//   return babelParser.parse(`import css from 'csz';`, {
//     plugins: ["importMeta"],
//     sourceType: "module",
//   });
// }

// function loadCSZ(val, spec) {
//   return babelParser.parse(
//     `const ${spec} = css\`\$\{new URL('${val}', import.meta.url).pathname\}\`;`,
//     { plugins: ["importMeta"], sourceType: "module" }
//   );
// }

function loadCSS(val) {
  return babelParser.parseExpression(
    `\n(() => {
    const linkEl = document.createElement("link");
    linkEl.href = new URL('${val}', import.meta.url).pathname;
    linkEl.type = "text/css";
    linkEl.rel = "stylesheet";
    document.head.appendChild(linkEl);
  })()\n`,
    { plugins: ["importMeta"], sourceType: "module" }
  );
}

function loadAssetURL(val) {
  return babelParser.parseExpression(
    `new URL('${val}', import.meta.url).pathname`,
    { plugins: ["importMeta"], sourceType: "module" }
  );
}

module.exports = function assetImportPlugin({ types: t, env }, {} = {}) {
  return {
    visitor: {
      ImportDeclaration(p, { file, opts }) {
        const source = p.get("source");
        // An export without a 'from' clause
        if (!source.node) {
          return;
        }
        const specs = p.get("specifiers") || [];
        const hasNoImportRefs = specs.length === 0;
        const defaultImportRef = specs.find(
          (s) => s.type === "ImportDefaultSpecifier"
        );
        const ext = path.extname(source.node.value);
        switch (ext) {
          case ".js":
          case ".jsx":
          case ".ts":
          case ".tsx":
          case "":
            return;

          case ".css":
            if (hasNoImportRefs && process.env.NODE_ENV !== "production") {
              // warn about flash of content?
              p.insertBefore(loadCSS(source.node.value));
              p.remove();
              return;
            }
            // throw an error?
            return;

          case ".svg":
          case ".png":
          case ".jpg":
          case ".jpeg":
            if (!defaultImportRef || specs.length > 1) {
              // throw an error / return.
              return;
            }
            if (process.env.NODE_ENV === "production") {
              return;
            }
            p.insertBefore(
              t.variableDeclaration("const", [
                t.variableDeclarator(
                  t.identifier(defaultImportRef.node.local.name),
                  loadAssetURL(source.node.value)
                ),
              ])
            );
            p.remove();
          default:
        }
      },
    },
  };
};
