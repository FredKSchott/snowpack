const fs = require('fs');
const path = require('path');
const execa = require('execa');
const npmRunPath = require('npm-run-path');
const findUp = require('find-up');

const IMPORT_REGEX = /\@(use|import|forward)\s*['"](.*?)['"]/g;
const PARTIAL_REGEX = /([\/\\])_(.+)(?![\/\\])/;

function stripFileExtension(filename) {
  return filename.split('.').slice(0, -1).join('.');
}

function findChildPartials(pathName, fileName, fileExt) {
  const dirPath = path.parse(pathName).dir;

  // Prepend a "_" to signify a partial.
  if (!fileName.startsWith('_')) {
    fileName = '_' + fileName;
  }

  // Add on the file extension if it is not already used.
  if (!fileName.endsWith('.scss') || !fileName.endsWith('.sass')) {
    fileName += fileExt;
  }

  const filePath = path.resolve(dirPath, fileName);

  let contents = '';
  try {
    contents = fs.readFileSync(filePath, 'utf8');
  } catch (err) {}

  return contents;
}

function scanSassImports(fileContents, filePath, fileExt, partials = new Set()) {
  // TODO: Replace with matchAll once Node v10 is out of TLS.
  // const allMatches = [...result.matchAll(new RegExp(HTML_JS_REGEX))];
  const allMatches = [];
  let match;
  const regex = new RegExp(IMPORT_REGEX);
  while ((match = regex.exec(fileContents))) {
    allMatches.push(match);
  }
  // return all imports, resolved to true files on disk.
  allMatches
    .map((match) => match[2])
    .filter((s) => s.trim())
    // Avoid node packages and core sass libraries.
    .filter((s) => !s.includes('node_modules') && !s.includes('sass:'))
    .forEach((fileName) => {
      let pathName = path.resolve(path.dirname(filePath), fileName);

      if (partials.has(pathName)) {
        return;
      }

      // Add this partial to the main list being passed to avoid duplicates.
      partials.add(pathName);

      // If it is a directory then look for an _index file.
      try {
        if (fs.lstatSync(pathName).isDirectory()) {
          fileName = 'index';
          pathName += '/' + fileName;
        }
      } catch (err) {}

      // Recursively find any child partials that have not already been added.
      const partialsContent = findChildPartials(pathName, fileName, fileExt);
      if (partialsContent) {
        const childPartials = scanSassImports(partialsContent, pathName, fileExt, partials);
        partials.add(...childPartials);
      }
    });

  return partials;
}

module.exports = function sassPlugin(snowpackConfig, {native, compilerOptions = {}} = {}) {
  const {root} = snowpackConfig || {};

  /** A map of partially resolved imports to the files that imported them. */
  const importedByMap = new Map();

  function addImportsToMap(filePath, sassImport) {
    const importedBy = importedByMap.get(sassImport);
    if (importedBy) {
      importedBy.add(filePath);
    } else {
      importedByMap.set(sassImport, new Set([filePath]));
    }
  }

  return {
    name: '@snowpack/plugin-sass',
    resolve: {
      input: ['.scss', '.sass'],
      output: ['.css'],
    },
    /**
     * If any files imported the given file path, mark them as changed.
     * @private
     */
    _markImportersAsChanged(filePath) {
      if (importedByMap.has(filePath)) {
        const importedBy = importedByMap.get(filePath);
        importedByMap.delete(filePath);
        for (const importerFilePath of importedBy) {
          this.markChanged(importerFilePath);
        }
      }
    },
    /**
     * When a file changes, also mark it's importers as changed.
     * Note that Sass has very lax matching of imports -> files.
     * Follow these rules to find a match: https://sass-lang.com/documentation/at-rules/use
     */
    onChange({filePath}) {
      const filePathNoExt = stripFileExtension(filePath);
      // check exact: "_index.scss" (/a/b/c/foo/_index.scss)
      this._markImportersAsChanged(filePath);
      // check no ext: "_index" (/a/b/c/foo/_index)
      this._markImportersAsChanged(filePathNoExt);
      // check no underscore: "index.scss" (/a/b/c/foo/index.scss)
      this._markImportersAsChanged(filePath.replace(PARTIAL_REGEX, '$1$2'));
      // check no ext, no underscore: "index" (/a/b/c/foo/index)
      this._markImportersAsChanged(filePathNoExt.replace(PARTIAL_REGEX, '$1$2'));
      // check folder import: "foo" (/a/b/c/foo)
      if (filePathNoExt.endsWith('_index')) {
        const folderPathNoIndex = filePathNoExt.substring(0, filePathNoExt.length - 7);
        this._markImportersAsChanged(folderPathNoIndex);
      }
    },
    /** Load the Sass file and compile it to CSS. */
    async load({filePath, isDev}) {
      const fileExt = path.extname(filePath);
      const contents = fs.readFileSync(filePath, 'utf8');

      // Sass partials should never be loaded directly, return nothing to ignore.
      if (path.basename(filePath).startsWith('_')) {
        return;
      }

      // During development, we need to track changes to Sass dependencies.
      if (isDev) {
        const sassImports = scanSassImports(contents, filePath, fileExt);
        [...sassImports].forEach((imp) => addImportsToMap(filePath, imp));
      }

      const args = ['--stdin'];

      // If file is `.sass`, use YAML-style. Otherwise, use default.
      if (fileExt === '.sass') {
        args.push('--indented');
      }

      // keep track of load paths later
      const loadPaths = new Set([path.dirname(filePath)]);
      const DEFAULT_LOAD_PATHS = new Set([root, process.cwd()]);
      const nodeModulesPath = await findUp('node_modules', {
        type: 'directory',
        cwd: root || __dirname,
      });
      if (nodeModulesPath) DEFAULT_LOAD_PATHS.add(nodeModulesPath);

      // Pass in user-defined options
      function parseCompilerOption([flag, value]) {
        let flagName = flag.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`); // convert camelCase to kebab-case
        switch (typeof value) {
          case 'boolean': {
            args.push(`--${value === false ? 'no-' : ''}${flagName}`);
            break;
          }
          case 'string':
          case 'number': {
            if (flagName === 'loadPath') {
              loadPaths.add(value); // don’t add these until default load paths are collected
            } else {
              args.push(`--${flagName}=${value}`);
            }
            break;
          }
          default: {
            if (Array.isArray(value)) {
              for (const val of value) {
                parseCompilerOption([flag, val]);
              }
              break;
            }
            throw new Error(
              `compilerOptions[${flag}] value not supported. Must be string, number, or boolean.`,
            );
          }
        }
      }
      Object.entries(compilerOptions).forEach(parseCompilerOption);

      // --load-path
      for (const dir of loadPaths) {
        args.push(`--load-path=${dir}`); // load user-specified loadPaths first
      }
      for (const dir of DEFAULT_LOAD_PATHS) {
        if (!loadPaths.has(dir)) {
          args.push(`--load-path=${dir}`); // then add default loadPaths (only if different)
        }
      }

      // Build the file.
      const execaOptions = {
        input: contents,
        // Adds the PATH param to the command so it can find local sass
        env: native ? undefined : npmRunPath.env(),
        extendEnv: native ? true : false,
      };

      // If not using native them specify the project root so execa finds the right sass binary.
      if (!native && root) {
        // Prefer the node_modules/.bin
        execaOptions.preferLocal = true;

        // Specifies the local directory (which contains a .bin with sass)
        execaOptions.localDir = root;
      }

      const {stdout, stderr} = await execa('sass', args, execaOptions);
      // Handle the output.
      if (stderr) throw new Error(stderr);
      if (stdout) return stdout;
    },
  };
};
