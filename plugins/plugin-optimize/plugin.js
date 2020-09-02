const fs = require('fs');
const path = require('path');
const glob = require('glob');
const colors = require('kleur/colors');
const esbuild = require('esbuild');
const {init, parse} = require('es-module-lexer');
const PQueue = require('p-queue').default;
const {
  appendHTMLToBody,
  appendHTMLToHead,
  HTML_JS_REGEX,
  isRemoteModule,
  relativeURL,
  removeLeadingSlash,
} = require('./util');

/**
 * Default optimizer for Snawpack, unless another one is given
 */
exports.default = function plugin(config, userDefinedOptions) {
  const options = {
    minifyJS: true,
    preloadModules: true,
    ...(userDefinedOptions || {}),
  };

  const CONCURRENT_WORKERS = require('os').cpus().length;

  /** Scan a JS file for static imports */
  function scanForStaticImports({file, rootDir, scannedFiles, importList}) {
    try {
      // 1. scan file for static imports
      scannedFiles.add(file); // mark file as scanned
      importList.add(file); // also mark file as an import if it hasn’t been already
      let code = fs.readFileSync(file, 'utf-8');
      const [imports] = parse(code);
      imports
        .filter(({d}) => d === -1) // this is where we discard dynamic imports (> -1) and import.meta (-2)
        .forEach(({s, e}) => {
          const specifier = code.substring(s, e);
          importList.add(
            specifier.startsWith('/')
              ? path.join(rootDir, removeLeadingSlash(file))
              : path.resolve(path.dirname(file), specifier),
          );
        });

      // 2. recursively scan imports not yet scanned
      [...importList]
        .filter((fileLoc) => !scannedFiles.has(fileLoc)) // prevent infinite loop
        .forEach((fileLoc) => {
          scanForStaticImports({file: fileLoc, rootDir, scannedFiles, importList}).forEach(
            (newImport) => {
              importList.add(newImport);
            },
          );
        });

      return importList;
    } catch (err) {
      console.warn(
        colors.dim('[@snowpack/plugin-optimize]') +
          colors.yellow(
            ` module preload failed: could not locate "${path.relative(rootDir, file)}"`,
          ),
      );
      return importList;
    }
  }

  /** Given a set of HTML files, trace the imported JS */
  function preloadModulesInHTML(htmlFile, rootDir) {
    const originalEntries = new Set(); // original entry files in HTML
    const allModules = new Set(); // all modules required by this HTML file

    let code = fs.readFileSync(htmlFile, 'utf-8');
    const scriptMatches = code.match(new RegExp(HTML_JS_REGEX));
    if (!scriptMatches || !scriptMatches.length) return code; // if nothing matched, exit

    // 1. identify all entries in HTML
    scriptMatches
      .filter((script) => script.toLowerCase().includes('src')) // we only need to preload external "src" scripts; on-page scripts are already exposed
      .forEach((script) => {
        const scriptSrc = script.replace(/.*src="([^"]+).*/i, '$1');
        if (!scriptSrc || isRemoteModule(scriptSrc)) return; // if no src, or it’s remote, skip this tag
        const entry = scriptSrc.startsWith('/')
          ? path.join(rootDir, removeLeadingSlash(scriptSrc))
          : path.normalize(path.join(path.dirname(htmlFile), scriptSrc));
        originalEntries.add(entry);
      });

    // 2. scan entries for additional imports
    const scannedFiles = new Set(); // keep track of files scanned so we don’t get stuck in a circular dependency
    originalEntries.forEach((entry) => {
      scanForStaticImports({
        file: entry,
        rootDir,
        scannedFiles,
        importList: allModules,
      }).forEach((file) => allModules.add(file));
    });

    // 3. add module preload to HTML (https://developers.google.com/web/updates/2017/12/modulepreload)
    const resolvedModules = [...allModules]
      .filter((m) => !originalEntries.has(m)) // don’t double-up preloading scripts that were already in the HTML
      .map((src) => relativeURL(rootDir, src).replace(/^\./, ''));
    if (!resolvedModules.length) return code; // don’t add useless whitespace

    resolvedModules.sort((a, b) => a.localeCompare(b));
    code = appendHTMLToHead(
      code,
      `  ` +
        resolvedModules
          .map(
            (src) =>
              `<!-- @snowpack/plugin-optimize] Add modulepreload to improve unbundled load performance
         More info: https://developers.google.com/web/updates/2017/12/modulepreload -->\n    <link rel="modulepreload" href="${src}" />`,
          )
          .join('') +
        '\n  ',
    );
    code = appendHTMLToBody(
      code,
      `  <!-- [@snowpack/plugin-optimize] modulepreload fallback for browsers that do not support it yet -->\n    ` +
        resolvedModules.map((src) => `<script type="module" src="${src}"></script>`).join('') +
        '\n  ',
    );

    // write file to disk
    return code;
  }

  async function optimizeFile({esbuildService, file, rootDir}) {
    const baseExt = path.extname(file).toLowerCase();

    // optimize based on extension. if it’s not here, leave as-is
    switch (baseExt) {
      case '.css': {
        // TODO: minify CSS
        break;
      }
      case '.js':
      case '.mjs': {
        // minify if enabled
        if (options.minifyJS) {
          try {
            let code = fs.readFileSync(file, 'utf-8');
            const minified = await esbuildService.transform(code, {minify: true});
            code = minified.js;
            fs.writeFileSync(file, code);
          } catch (err) {
            console.error(
              colors.dim('[@snowpack/plugin-optimize]') +
                `Error minifying JS [${file}]\n${err.toString()}`,
            );
          }
        }
        break;
      }
      case '.html': {
        if (options.preloadModules) {
          let code = preloadModulesInHTML(file, rootDir);
          // TODO: minify HTML
          fs.writeFileSync(file, code, 'utf-8');
        }
        break;
      }
    }
  }

  return {
    name: '@snowpack/plugin-optimize',
    async optimize({buildDirectory}) {
      // 0. setup
      const esbuildService = await esbuild.startService();
      await init;

      // 1. scan directory
      const allFiles = glob
        .sync('**/*', {
          cwd: buildDirectory,
          ignore: [`${config.buildOptions.metaDir}/*`, ...((options && options.exclude) || [])],
          nodir: true,
        })
        .map((file) => path.join(buildDirectory, file)); // resolve to root dir

      // 2. optimize all files in parallel
      const parallelWorkQueue = new PQueue({concurrency: CONCURRENT_WORKERS});
      for (const file of allFiles) {
        parallelWorkQueue.add(() => optimizeFile({file, esbuildService, rootDir: buildDirectory}));
      }
      await parallelWorkQueue.onIdle();

      // 3. clean up
      esbuildService.stop();
    },
  };
};
