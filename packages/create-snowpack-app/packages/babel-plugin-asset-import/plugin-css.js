const path = require("path");
const babelParser = require("@babel/parser");

function importCSZ() {
  return babelParser.parse(`import css from 'csz';`);
}

function loadCSZ(val, spec) {
  return babelParser.parse(`const spec = css\`${val}\`;`);
}

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

module.exports = function pikaWebBabelTransform({ types: t, env }, {} = {}) {
  return {
    pre(state) {
      this.hasCSZImport = false;
    },
    visitor: {
      ImportDeclaration(p, { file, opts }) {
        const source = p.get("source");
        // An export without a 'from' clause
        if (!source.node) {
          return;
        }
        const ext = path.extname(source.node.value);
        if (ext !== ".css") {
          return;
        }

        const specs = p.get("specifiers") || [];
        const hasNoImportRefs = specs.length === 0;
        const defaultImportRef = specs.find(
          (s) => s.type === "ImportDefaultSpecifier"
        );
      },
    },
  };
};
