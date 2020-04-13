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
  importMapJson = JSON.parse(fileContents);
  return importMapJson;
}

function rewriteImport(
  importMap,
  imp,
  file,
  webModulesDir,
  webModulesUrlPath,
  shouldResolveRelative,
  importType,
) {
  const isSourceImport = imp.startsWith('/') || imp.startsWith('.') || imp.startsWith('\\');
  const isRemoteImport = imp.startsWith('http://') || imp.startsWith('https://');
  const mappedImport = importMap.imports[imp];
  if (mappedImport) {
    if (mappedImport.startsWith('http://') || mappedImport.startsWith('https://')) {
      return mappedImport;
    } else {
      const joinedImport = path.posix.join(webModulesUrlPath, mappedImport);
      if (importType === 'relative') {
        const relativeToRoot = path.relative(path.dirname(file.opts.filename), file.opts.root);
        const relativeToDir = path
          .relative(path.dirname(webModulesDir), relativeToRoot)
          .replace(/\\/g, '/');
        return relativeToDir + joinedImport;
      }
      return joinedImport;
    }
  }
  if (isRemoteImport) {
    return imp;
  }
  if (!isSourceImport && !mappedImport) {
    console.log(`warn: bare import "${imp}" not found in import map, ignoring...`);
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
      console.warn(err.message);
      return imp + '.js';
    }
  }
  return imp;
}

/**
 * BABEL OPTIONS:
 *   webModulesUrlPath  - The web_modules installed location once hosted on the web.
 *                        Defaults to "/web_modules", which translates absolute imports to "/web_modules/PACKAGE_NAME".
 *   webModulesDir      - The web_modules installed location on disk. Can be an absolute path, or relative to the current working directory.
 *                        Defaults to "./web_modules".
 *   importMap          - The name/location of the "import-map.json" file generated by Snowpack.
 *                        Relative to the dir path on disk. Defaults to "${dir}/import-map.json".
 *   importType         - Control how the plugin rewrites bare module, dependency imports. Defaults to "absolute".
 *                        - "absolute": Import dependencies by absolute path (ex: "/web_modules/PACKAGE_NAME")
 *                        - "relative": Import dependencies by relative path on disk (ex: "../web_modules/PACKAGE_NAME")
 *   moduleResolution   - Control how the plugin rewrites relative/local imports. Defaults to "none".
 *                        - "none": Leave relative imports untouched.
 *                        - "node": Rewrite all relative paths to use node's built-in resolution, resolving things like
 *                          missing file extensions and directory imports. This is useful to assist migrating an older,
 *                          bundled project to Snowpack.
 *   dir                - DEPRECATED: use "webModulesUrlPath" & "webModulesDir" instead.
 *   optionalExtensions - DEPRECATED: use "resolve: node" instead.
 */
module.exports = function pikaWebBabelTransform(
  {types: t, env},
  {
    moduleResolution,
    importType,
    webModulesDir,
    webModulesUrlPath,
    addVersion,
    importMap,
    optionalExtensions,
    dir,
  } = {},
) {
  // Deprecation warnings
  if (dir) {
    console.warn(
      'warn: "dir" option is now deprecated. Please update to use "webModulesUrlPath" & "webModulesDir" instead.',
    );
  }
  if (addVersion) {
    console.warn(
      'warn: "addVersion" option is now built into Snowpack and on by default. The Babel option is no longer needed.',
    );
  }
  // Default options
  webModulesUrlPath = webModulesUrlPath || (dir && `/${dir}`) || '/web_modules';
  webModulesDir = path.resolve(process.cwd(), webModulesDir || dir || 'web_modules');
  importType = importType || 'absolute';
  const shouldResolveRelative = moduleResolution === 'node' || !!optionalExtensions;
  // Input warnings
  if (!webModulesUrlPath.startsWith('/')) {
    throw new Error('"webModulesUrlPath" must be an absolute URL path (start with "/").');
  }
  // Plugin code
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
        source.replaceWith(
          t.stringLiteral(
            rewriteImport(
              this.importMapJson,
              source.node.value,
              file,
              webModulesDir,
              webModulesUrlPath,
              shouldResolveRelative,
              importType,
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
        source.replaceWith(
          t.stringLiteral(
            rewriteImport(
              this.importMapJson,
              source.node.value,
              file,
              webModulesDir,
              webModulesUrlPath,
              shouldResolveRelative,
              importType,
            ),
          ),
        );
      },
    },
  };
};
