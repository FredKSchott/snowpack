const path = require('path');
// A lame copy-paste from src/index.ts
function getWebDependencyName(dep) {
  return dep.replace(/\.js$/, '');
}

function rewriteImport(imp, shouldAddMissingExtension) {
  const isSourceImport = imp.startsWith('/') || imp.startsWith('.')|| imp.startsWith('\\');
  if (!isSourceImport) {
    return `/web_modules/${getWebDependencyName(imp)}.js`;
  }
  if (shouldAddMissingExtension && !path.extname(imp)) {
    return imp + '.js';
  }
  return imp;
}

/**
 * BABEL OPTIONS:
 *   optionalExtensions - Adds any missing JS extensions to local/relative imports. Support for these
 *                        partial imports is missing in the browser and being phased out of Node.js, but
 *                        this can be a useful option for migrating an old project to @pika/web.
 */
module.exports = function pikaWebBabelTransform({types: t}, {optionalExtensions}) {
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
          t.stringLiteral(rewriteImport(source.node.value, optionalExtensions)),
        );
      },
      'ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration'(path, {file, opts}) {
        const source = path.get('source');

        // An export without a 'from' clause
        if (!source.node) {
          return;
        }

        source.replaceWith(
          t.stringLiteral(rewriteImport(source.node.value, optionalExtensions)),
        );
      },
    },
  };
}
