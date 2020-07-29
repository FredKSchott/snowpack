const fs = require('fs');
const path = require('path');
const nodeResolve = require('enhanced-resolve');

function readImportMapFile(explicitPath, webModulesDir) {
  if (explicitPath) {
    if (path.isAbsolute(explicitPath)) {
      return fs.readFileSync(explicitPath, {encoding: 'utf8'});
    }
    const explicitImportMap = path.join(webModulesDir, explicitPath);
    return fs.readFileSync(explicitImportMap, {encoding: 'utf8'});
  }
  const localImportMap = path.join(webModulesDir, `import-map.local.json`);
  const defaultImportMap = path.join(webModulesDir, `import-map.json`);
  try {
    return fs.readFileSync(localImportMap, {encoding: 'utf8'});
  } catch (err) {
    // do nothing
  }
  try {
    return fs.readFileSync(defaultImportMap, {encoding: 'utf8'});
  } catch (err) {
    // do nothing
  }
  throw new Error(`Import map not found. Run Snowpack first to generate one.
  ✘ ${localImportMap}
  ✘ ${defaultImportMap}`);
}

function getImportMap(explicitPath, webModulesDir) {
  const fileContents = readImportMapFile(explicitPath, webModulesDir);
  const importMapJson = JSON.parse(fileContents);
  return importMapJson;
}

function rewriteImport(importMap, imp, file, webModulesUrl, shouldResolveRelative) {
  const isSourceImport = imp.startsWith('/') || imp.startsWith('.') || imp.startsWith('\\');
  const isRemoteImport = imp.startsWith('http://') || imp.startsWith('https://');
  const mappedImport = importMap.imports[imp];
  if (mappedImport) {
    if (mappedImport.startsWith('http://') || mappedImport.startsWith('https://')) {
      return mappedImport;
    } else if (
      webModulesUrl.startsWith('http://') ||
      webModulesUrl.startsWith('https://') ||
      webModulesUrl.startsWith('//')
    ) {
      // normalize() is needed to remove any proceeding './'
      return webModulesUrl + path.posix.normalize(mappedImport);
    } else {
      const joinedImport = path.posix.join(webModulesUrl, mappedImport);
      if (joinedImport.startsWith('/')) {
        return joinedImport;
      }
      const relativeToRoot = path
        .relative(path.dirname(file.opts.filename), file.opts.root)
        .replace(/\\/g, '/');
      return path.posix.join(relativeToRoot, joinedImport);
    }
  }
  if (isRemoteImport) {
    return imp;
  }
  if (!isSourceImport && !mappedImport) {
    console.error(`warn: bare import "${imp}" not found in import map, ignoring...`);
    return imp;
  }
  if (isSourceImport && shouldResolveRelative) {
    try {
      const dirOfFile = path.dirname(file.opts.filename);
      const absPath = nodeResolve.create.sync({
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
      })(dirOfFile, imp);
      const relativePath = path
        .relative(dirOfFile, absPath)
        .replace(/(\.ts|\.tsx|.jsx)$/, '.js')
        .replace(/\\/g, '/');
      return relativePath.startsWith('.') ? relativePath : './' + relativePath;
    } catch (err) {
      // File could not be resolved by Node
      // We warn and just fallback to old 'optionalExtensions' behaviour of appending .js
      console.error(err.message);
      return imp + '.js';
    }
  }
  return imp;
}

module.exports = function pikaWebBabelTransform(
  {types: t, env},
  {
    moduleResolution,
    webModulesDir,
    webModulesUrl,
    addVersion,
    importMap,
    optionalExtensions,
    ignore,
    dir,
  } = {},
) {
  // Deprecation warnings
  if (dir) {
    console.error(
      'warn: "dir" option is deprecated and has been removed. Please update to use "webModulesUrl" or "webModulesDir" instead.',
    );
  }
  if (addVersion) {
    console.error(
      'warn: "addVersion" option is now built into Snowpack and on by default. The Babel option is no longer needed.',
    );
  }
  // Default options
  webModulesDir = path.resolve(process.cwd(), webModulesDir || 'web_modules');
  webModulesUrl = webModulesUrl || '/web_modules/';
  if (!webModulesUrl.endsWith('/')) {
    webModulesUrl += '/';
  }
  // Plugin behavior
  const shouldResolveRelative = moduleResolution === 'node' || !!optionalExtensions;
  return {
    pre() {
      this.importMapJson = getImportMap(importMap, webModulesDir);
    },
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
        if (ignore && ignore.includes(source.node.value)) {
          return;
        }
        source.replaceWith(
          t.stringLiteral(
            rewriteImport(
              this.importMapJson,
              source.node.value,
              file,
              webModulesUrl,
              shouldResolveRelative,
            ),
          ),
        );
      },
      'ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration'(path, {file, opts}) {
        const source = path.get('source');
        // An export without a 'from' clause
        if (!source.node) {
          return;
        }
        if (ignore && ignore.includes(source.node.value)) {
          return;
        }
        source.replaceWith(
          t.stringLiteral(
            rewriteImport(
              this.importMapJson,
              source.node.value,
              file,
              webModulesUrl,
              shouldResolveRelative,
            ),
          ),
        );
      },
    },
  };
};
