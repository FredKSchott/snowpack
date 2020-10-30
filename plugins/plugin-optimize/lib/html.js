/**
 * Logic for optimizing .html files (note: this will )
 */
const fs = require('fs');
const path = require('path');
const hypertag = require('hypertag');
const {injectHTML} = require('node-inject-html');
const {projectURL, isRemoteModule} = require('../util');
const {scanJS} = require('./js');

/** Scan HTML for static imports */
async function scanHTML(htmlFiles, buildDirectory) {
  const importList = {};
  await Promise.all(
    htmlFiles.map(async (htmlFile) => {
      // TODO: add debug in plugins?
      // log(`scanning ${projectURL(file, buildDirectory)} for imports`, 'debug');

      const allCSSImports = new Set(); // all CSS imports for this HTML file
      const allJSImports = new Set(); // all JS imports for this HTML file
      const entry = new Set(); // keep track of HTML entry files

      const code = await fs.promises.readFile(htmlFile, 'utf-8');

      // <link>
      hypertag(code, 'link').forEach((link) => {
        if (!link.href) return;
        if (isRemoteModule(link.href)) {
          allCSSImports.add(link.href);
        } else {
          const resolvedCSS =
            link.href[0] === '/'
              ? path.join(buildDirectory, link.href)
              : path.join(path.dirname(htmlFile), link.href);
          allCSSImports.add(resolvedCSS);
        }
      });

      // <script>
      hypertag(code, 'script').forEach((script) => {
        if (!script.src) return;
        if (isRemoteModule(script.src)) {
          allJSImports.add(script.src);
        } else {
          const resolvedJS =
            script.src[0] === '/'
              ? path.join(buildDirectory, script.src)
              : path.join(path.dirname(htmlFile), script.src);
          allJSImports.add(resolvedJS);
          entry.add(resolvedJS);
        }
      });

      // traverse all JS for other static imports (scannedFiles keeps track of files so we never redo work)
      const scannedFiles = new Set();
      allJSImports.forEach((jsFile) => {
        scanJS({
          file: jsFile,
          rootDir: buildDirectory,
          scannedFiles,
          importList: allJSImports,
        }).forEach((i) => allJSImports.add(i));
      });

      // return
      importList[htmlFile] = {
        entry: Array.from(entry),
        css: Array.from(allCSSImports),
        js: Array.from(allJSImports),
      };
    }),
  );
  return importList;
}
exports.scanHTML = scanHTML;

/** Given a set of HTML files, trace the imported JS */
function preloadJS({code, file, preloadCSS, rootDir}) {
  const originalEntries = new Set(); // original entry files in HTML
  const allModules = new Set(); // all modules required by this HTML file

  // 1. scan HTML for <script> tags
  hypertag(code, 'script').forEach((script) => {
    if (!script.type || script.type !== 'module' || !script.src) return;
    const resolvedJS =
      script.src[0] === '/'
        ? path.join(rootDir, script.src)
        : path.join(path.dirname(file), script.src);
    originalEntries.add(resolvedJS);
  });

  // 2. scan entries for additional imports
  const scannedFiles = new Set(); // keep track of files scanned so we don’t get stuck in a circular dependency
  originalEntries.forEach((entry) => {
    scanJS({
      file: entry,
      rootDir,
      scannedFiles,
      importList: allModules,
    }).forEach((file) => allModules.add(file));
  });

  // 3. add module preload to HTML (https://developers.google.com/web/updates/2017/12/modulepreload)
  const resolvedModules = [...allModules]
    .filter((m) => !originalEntries.has(m)) // don’t double-up preloading scripts that were already in the HTML
    .filter((m) => (preloadCSS ? !m.endsWith('.css.proxy.js') : true)) // if preloading CSS, don’t preload .css.proxy.js
    .map((src) => projectURL(src, rootDir));
  if (!resolvedModules.length) return code; // don’t add useless whitespace
  resolvedModules.sort((a, b) => a.localeCompare(b));

  // 4. return HTML with preloads added
  return injectHTML(code, {
    headEnd:
      `<!-- [@snowpack/plugin-optimize] Add modulepreload to improve unbundled load performance (More info: https://developers.google.com/web/updates/2017/12/modulepreload) -->\n` +
      resolvedModules.map((src) => `    <link rel="modulepreload" href="${src}" />`).join('\n') +
      '\n',
    bodyEnd:
      `<!-- [@snowpack/plugin-optimize] modulepreload fallback for browsers that do not support it yet -->\n    ` +
      resolvedModules.map((src) => `<script type="module" src="${src}"></script>`).join('') +
      '\n',
  });
}
exports.preloadJS = preloadJS;
