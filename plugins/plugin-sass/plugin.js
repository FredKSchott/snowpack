const fs = require('fs');
const path = require('path');
const execa = require('execa');
const npmRunPath = require('npm-run-path');

const IMPORT_REGEX = /\@(use|import)\s*['"](.*?)['"]/g;

function scanSassImports(fileContents, filePath, fileExt) {
  // TODO: Replace with matchAll once Node v10 is out of TLS.
  // const allMatches = [...result.matchAll(new RegExp(HTML_JS_REGEX))];
  const allMatches = [];
  let match;
  const regex = new RegExp(IMPORT_REGEX);
  while ((match = regex.exec(fileContents))) {
    allMatches.push(match);
  }
  // return all imports, resolved to true files on disk.
  return allMatches
    .map((match) => match[2])
    .filter((s) => s.trim())
    .map((s) => {
      // Inherit the default file extension of the importer. This is a cheap
      // but effective shortcut to supporting both ".scss" and ".sass"
      // since users rarely mix both, and performing multiple lookups
      // would be too expensive.
      if (!path.extname(s)) {
        s += fileExt;
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
        this.markChanged(importerFilePath);
      }
    },
    /** Load the Sass file and compile it to CSS. */
    async load({filePath, isDev}) {
      const fileExt = path.extname(filePath);
      const contents = fs.readFileSync(filePath, 'utf8');
      // During development, we need to track changes to Sass dependencies.
      if (isDev) {
        const sassImports = scanSassImports(contents, filePath, fileExt);
        addImportsToMap(filePath, sassImports);
      }
      // If file is `.sass`, use YAML-style. Otherwise, use default.
      const args = ['--stdin', '--load-path', path.dirname(filePath)];
      if (fileExt === '.sass') {
        args.push('--indented');
      }
      // Build the file.
      const {stdout, stderr} = await execa('sass', args, {
        input: contents,
        env: native ? undefined : npmRunPath.env(),
        extendEnv: native ? true : false,
      });
      // Handle the output.
      if (stderr) throw new Error(stderr);
      if (stdout) return stdout;
    },
  };
};
