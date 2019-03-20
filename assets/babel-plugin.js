// A lame copy-paste from src/index.ts
function getWebDependencyName(dep) {
  return dep.replace(/\.js$/, '');
}

function rewriteBareModuleImport(imp) {
  if (imp.startsWith('/') || imp.startsWith('.')|| imp.startsWith('\\')) {
    return imp;
  }
  return `/web_modules/${getWebDependencyName(imp)}.js`;
}

module.exports = function pikaWebBabelTransform({types: t}) {
  return {
    visitor: {
      CallExpression(path, {file, opts}) {
        if (path.node.callee.type !== 'Import') {
          return;
        }

        const [source] = path.get('arguments');
        if (source.type !== 'StringLiteral') {
          /* Should never happen */
          return;
        }


        source.replaceWith(
          t.stringLiteral(rewriteBareModuleImport(source.node.value)),
        );
      },
      'ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration'(path, {file, opts}) {
        const source = path.get('source');

        // An export without a 'from' clause
        if (source.node === null) {
          return;
        }

        source.replaceWith(
          t.stringLiteral(rewriteBareModuleImport(source.node.value)),
        );
      },
    },
  };
}
