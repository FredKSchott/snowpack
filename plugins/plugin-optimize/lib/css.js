const fs = require('fs');
const path = require('path');
const {parse} = require('es-module-lexer');
const csso = require('csso');

/** Early-exit function that determines, given a set of JS files, if CSS is being imported */
function hasCSSImport(files) {
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf-8');
    const [imports] = parse(code);
    for (const {s, e} of imports.filter(({d}) => d === -1)) {
      const spec = code.substring(s, e);
      if (spec.endsWith('.css.proxy.js')) return true; // exit as soon as we find one
    }
  }
  return false;
}
exports.hasCSSImport = hasCSSImport;

/**
 * Scans JS for CSS imports, and embeds only what’s needed
 *
 * import 'global.css'                       -> (removed; loaded in HTML)
 * import url from 'global.css'              -> const url = 'global.css'
 * import {foo, bar} from 'local.module.css' -> const {foo, bar} = 'local.module.css'
 */
function transformCSSProxy(file, originalCode) {
  const filePath = path.dirname(file);
  let code = originalCode;

  const getProxyImports = (code) =>
    parse(code)[0]
      .filter(({d}) => d === -1) // discard dynamic imports (> -1) and import.meta (-2)
      .filter(({s, e}) => code.substring(s, e).endsWith('.css.proxy.js')); // only accept .css.proxy.js files

  // iterate through proxy imports
  let proxyImports = getProxyImports(code);
  while (proxyImports.length) {
    const {s, e, ss, se} = proxyImports[0]; // only transform one at a time, because every transformation requires re-parsing (unless you created an ellaborate mechanism to keep track of character counts but IMO parsing is simpler/cheaper)

    const originalImport = code.substring(s, e);
    const importedFile = originalImport.replace(/\.proxy\.js$/, '');
    const importNamed = code
      .substring(ss, se)
      .replace(code.substring(s - 1, e + 1), '') // remove import
      .replace(/^import\s+/, '') // remove keyword
      .replace(/\s*from.*$/, '') // remove other keyword
      .replace(/\*\s+as\s+/, '') // sanitize star imports
      .trim();

    // transform JS
    if (!importNamed) {
      // option 1: no transforms needed
      code = code.replace(new RegExp(`${code.substring(ss, se)};?\n?`), '');
    } else {
      if (importedFile.endsWith('.module.css')) {
        // option 2: transform css modules
        const proxyCode = fs.readFileSync(path.resolve(filePath, originalImport), 'utf-8');
        const matches = proxyCode.match(/^let json\s*=\s*(\{[^\}]+\})/m);
        if (matches) {
          code = code.replace(
            new RegExp(`${code.substring(ss, se).replace(/\*/g, '\\*')};?`),
            `const ${importNamed.replace(/\*\s+as\s+/, '')} = ${matches[1]};`,
          );
        }
      } else {
        // option 3: transfrom normal css
        code = code.replace(
          new RegExp(`${code.substring(ss, se)};?`),
          `const ${importNamed} = '${importedFile}';`,
        );
      }
    }

    proxyImports = getProxyImports(code); // re-parse code, continuing until all are transformed
  }

  return code;
}
exports.transformCSSProxy = transformCSSProxy;

/** Build CSS File */
function buildImportCSS(manifest, minifyCSS) {
  // gather list of imported CSS files
  const allCSSFiles = new Set();
  for (const f in manifest) {
    manifest[f].js.forEach((js) => {
      if (!js.endsWith('.css.proxy.js')) return;
      const isCSSModule = js.endsWith('.module.css.proxy.js');
      allCSSFiles.add(isCSSModule ? js : js.replace(/\.proxy\.js$/, ''));
    });
  }

  // read + concat
  let code = '';
  allCSSFiles.forEach((file) => {
    const contents = fs.readFileSync(file, 'utf-8');

    if (file.endsWith('.module.css.proxy.js')) {
      // css modules
      const matches = contents.match(/^export let code = *(.*)$/m);
      if (matches && matches[1])
        code +=
          '\n' +
          matches[1]
            .trim()
            .replace(/^('|")/, '')
            .replace(/('|");?$/, '');
    } else {
      // normal css
      code += '\n' + contents;
      fs.unlinkSync(file); // after we‘ve scanned a CSS file, remove it (so it‘s not double-loaded)
    }
  });

  // sanitize JSON values
  const css = code.replace(/\\n/g, '\n').replace(/\\"/g, '"');

  // minify
  return minifyCSS ? csso.minify(css).css : css;
}
exports.buildImportCSS = buildImportCSS;
