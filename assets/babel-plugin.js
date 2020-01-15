const path = require('path');
const finder = require('find-package-json');

const VERSION_TAG = 'v';

// A lame copy-paste from src/index.ts
function getWebDependencyName(dep) {
  return dep.replace(/\.js$/, '');
}

function getPackageVersion(package) {
  // First three are path for @babel/cli, so ignore
  const modulesPath = require.main.paths.slice(3);
  const entryPointPath = require.resolve(package, {paths: modulesPath});
  const json = finder(entryPointPath).next().value;
  return json.version;
}

function rewriteImport(imp, dir, shouldAddMissingExtension, shouldAddVersion) {
  const isSourceImport = imp.startsWith('/') || imp.startsWith('.') || imp.startsWith('\\');
  const isRemoteimport = imp.startsWith('http://') || imp.startsWith('https://');
  dir = dir || 'web_modules';
  if (!isSourceImport && !isRemoteimport) {
    return shouldAddVersion
      ? path.posix.join('/', dir, `${getWebDependencyName(imp)}.js`) +
          `?${VERSION_TAG}=${getPackageVersion(imp)}`
      : path.posix.join('/', dir, `${getWebDependencyName(imp)}.js`);
  }
  if (!isRemoteimport && shouldAddMissingExtension && !path.extname(imp)) {
    return imp + '.js';
  }
  return imp;
}

/**
 * BABEL OPTIONS:
 *   addVersion         - Adds package version as a query parameter to package imports.
 *                        The package imports will be like `/web_modules/PACKAGE_NAME?v=1.2.3`.
 *   dir                - The web_modules installed location once hosted on the web.
 *                        Defaults to "web_modules", which translates package imports to "/web_modules/PACKAGE_NAME".
 *   optionalExtensions - Adds any missing JS extensions to local/relative imports. Support for these
 *                        partial imports is missing in the browser and being phased out of Node.js, but
 *                        this can be a useful option for migrating an old project to Snowpack.
 */
module.exports = function pikaWebBabelTransform(
  {types: t},
  {optionalExtensions, dir, addVersion} = {},
) {
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
          t.stringLiteral(rewriteImport(source.node.value, dir, optionalExtensions, addVersion)),
        );
      },
      'ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration'(path, {file, opts}) {
        const source = path.get('source');

        // An export without a 'from' clause
        if (!source.node) {
          return;
        }

        source.replaceWith(
          t.stringLiteral(rewriteImport(source.node.value, dir, optionalExtensions, addVersion)),
        );
      },
    },
  };
};
