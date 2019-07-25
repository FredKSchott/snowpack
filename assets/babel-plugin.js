const path = require('path');

// A lame copy-paste from src/index.ts
function getWebDependencyName(dep) {
  return dep.replace(/\.js$/, '');
}

function rewriteBareModuleImport(imp, addMissingJsExtensions) {
  const extname = addMissingJsExtensions && '.js';
  if (imp.startsWith('/') || imp.startsWith('.')|| imp.startsWith('\\')) {
    if (extname && !path.extname(imp)) imp += extname;
    return imp;
  }
  return `/web_modules/${getWebDependencyName(imp)}.js`;
}

module.exports = function pikaWebBabelTransform({types: t}, options) {
  const addMissingJsExtensions = options.addMissingJsExtensions;
  const rewriteBareModuleName = options.rewriteBareModuleName || rewriteBareModuleImport;
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
          t.stringLiteral(rewriteBareModuleName(source.node.value, addMissingJsExtensions)),
        );
      },
      'ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration'(path, {file, opts}) {
        const source = path.get('source');

        // An export without a 'from' clause
        if (!source.node) {
          return;
        }

        source.replaceWith(
          t.stringLiteral(rewriteBareModuleName(source.node.value, addMissingJsExtensions)),
        );
      },
    },
  };
}
