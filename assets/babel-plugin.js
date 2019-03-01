function rewriteBareModuleImport(imp) {
  if (imp.startsWith('/') || imp.startsWith('.')|| imp.startsWith('\\')) {
    return imp;
  }

  if (imp.startsWith('@')) {
    const [owner, packageName, ...parts] = imp.split('/');
    if (parts.length > 0) {
      return imp;
    }
    return `/web_modules/${owner}--${packageName}.js`;
  }

  const [packageName, ...parts] = imp.split('/');
  if (parts.length > 0) {
    return imp;
  }
  return `/web_modules/${packageName}.js`;
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
