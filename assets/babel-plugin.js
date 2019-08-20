const path = require('path');
// A lame copy-paste from src/index.ts
function getWebDependencyName(dep) {
  return dep.replace(/\.js$/, '');
}

function rewriteImport(imp, dir, shouldAddMissingExtension) {
  const isSourceImport = imp.startsWith('/') || imp.startsWith('.')|| imp.startsWith('\\');
  const isRemoteimport = imp.startsWith('http://') || imp.startsWith('https://');
  dir = dir || 'web_modules';
  if (!isSourceImport && !isRemoteimport) {
    return path.posix.join('/', dir, `${getWebDependencyName(imp)}.js`);
  }
  if (!isRemoteimport && shouldAddMissingExtension && !path.extname(imp)) {
    return imp + '.js';
  }
  return imp;
}

/**
 * BABEL OPTIONS:
 *   dir                - The web_modules installed location once hosted on the web.
 *                        Defaults to "web_modules", which translates package imports to "/web_modules/PACKAGE_NAME".
 *   optionalExtensions - Adds any missing JS extensions to local/relative imports. Support for these
 *                        partial imports is missing in the browser and being phased out of Node.js, but
 *                        this can be a useful option for migrating an old project to @pika/web.
 */
module.exports = function pikaWebBabelTransform({types: t}, {optionalExtensions, dir}) {
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
          t.stringLiteral(rewriteImport(source.node.value, dir, optionalExtensions)),
        );
      },
      'ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration'(path, {file, opts}) {
        const source = path.get('source');

        // An export without a 'from' clause
        if (!source.node) {
          return;
        }

        source.replaceWith(
          t.stringLiteral(rewriteImport(source.node.value, dir, optionalExtensions)),
        );
      },
    },
  };
}
