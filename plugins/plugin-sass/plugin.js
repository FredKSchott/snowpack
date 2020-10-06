const fs = require('fs');
const path = require('path');
const execa = require('execa');
const npmRunPath = require('npm-run-path');

const IMPORT_REGEX = /\@(use|import)\s*['"](.*?)['"]/g;

function scanSassImports(fileContents, filePath) {
  // TODO: Replace with matchAll once Node v10 is out of TLS.
  // const allMatches = [...result.matchAll(new RegExp(HTML_JS_REGEX))];
  const allMatches = [];
  let match;
  const regex = new RegExp(IMPORT_REGEX);
  while ((match = regex.exec(fileContents))) {
    allMatches.push(match);
  }
  // Inherit the default file extension of the importer. This is a cheap
  // but effective shortcut to supporting both ".scss" and ".sass"
  // since users rarely mix both, and performing multiple lookups
  // would be too expensive.
  const missingFileExt = path.extname(filePath);
  // return all imports, resolved to true files on disk.
  return allMatches
    .map((match) => match[2])
    .filter((s) => s.trim())
    .map((s) => {
      if (!path.extname(s)) {
        s += missingFileExt;
      }
      return path.resolve(path.dirname(filePath), s);
    });
}

module.exports = function postcssPlugin(_, {native}) {
  const importedByMap = new Map();

  function addImportsToMap(filePath, sassImports) {
    for (const imported of sassImports) {
      const importedBy = importedByMap.get(imported);
      if (importedBy) {
        importedBy.add(filePath);
      } else {
        importedByMap.set(imported, new Set([filePath]));
      }
    }
  }

  return {
    name: '@snowpack/plugin-sass',
    resolve: {
      input: ['.scss', '.sass'],
      output: ['.css'],
    },
    /** when a file changes, also mark it's importers as changed. */
    onChange({filePath}) {
      const importedBy = importedByMap.get(filePath);
      if (!importedBy) {
        return;
      }
      importedByMap.delete(filePath);
      for (const importerFilePath of importedBy) {
        this.markChange(importerFilePath);
      }
    },
    /** Load the Sass file and compile it to CSS. */
    async load({filePath, isDev}) {
      const contents = fs.readFileSync(filePath, 'utf8');
      // During development, we need to track changes to Sass dependencies.
      if (isDev) {
        const sassImports = scanSassImports(contents, filePath);
        addImportsToMap(filePath, sassImports);
      }
      // Build the file.
      const {stdout, stderr} = await execa(
        'sass',
        ['--stdin', '--load-path', path.dirname(filePath)],
        {
          input: contents,
          env: native ? undefined : npmRunPath.env(),
          extendEnv: native ? true : false,
        },
      );
      // Handle the output.
      if (stderr) throw new Error(stderr);
      if (stdout) return stdout;
    },
  };
};
