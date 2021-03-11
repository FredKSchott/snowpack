// HACK to bypass Rollup re-writing valid dynamic `import()` statement
const fs = require('fs');
const path = require('path');
const rootDirectory = path.join(__dirname, '../..');

function replaceNativeImport() {
  const filepath = path.join(rootDirectory, 'snowpack', 'lib', 'index.js');

  let contents = fs.readFileSync(filepath).toString();
  contents = contents.replace(/^(const NATIVE_IMPORT =.*)$/gm, '').replace(/NATIVE_IMPORT\(/gm, 'import(');
  fs.writeFileSync(filepath, contents);
}

replaceNativeImport();
