const fs = require('fs');
const path = require('path');
const glob = require('glob');
const {minify: minifyHtml} = require('html-minifier');
const csso = require('csso');
const esbuild = require('esbuild');
const {init} = require('es-module-lexer');
const mkdirp = require('mkdirp');
const PQueue = require('p-queue').default;
const {injectHTML} = require('node-inject-html');
const {buildImportCSS, transformCSSProxy} = require('./lib/css');
const {scanHTML, preloadJS} = require('./lib/html');
const {formatManifest, log} = require('./util');

/**
 * Default optimizer for Snawpack, unless another one is given
 */
exports.default = function plugin(config, userDefinedOptions) {
  const options = {
    minifyJS: true,
    minifyHTML: true,
    minifyCSS: true,
    preloadCSS: false,
    preloadCSSFileName: '/imported-styles.css',
    preloadModules: false,
    ...(userDefinedOptions || {}),
  };

  const CONCURRENT_WORKERS = require('os').cpus().length;

  async function optimizeFile({esbuildService, file, preloadCSS, target, rootDir}) {
    const baseExt = path.extname(file).toLowerCase();

    // TODO: add debug in plugins?
    // log(`optimizing ${projectURL(file, rootDir)}…`, 'debug');

    // optimize based on extension. if it’s not here, leave as-is
    switch (baseExt) {
      case '.css': {
        const shouldOptimize = options.minifyCSS;
        if (!shouldOptimize) return;

        // minify
        let code = fs.readFileSync(file, 'utf-8');
        code = csso.minify(code).css;
        fs.writeFileSync(file, code, 'utf-8');
        break;
      }
      case '.js':
      case '.mjs': {
        const shouldOptimize = options.preloadCSS || options.minifyJS;
        if (!shouldOptimize) return;

        let code = fs.readFileSync(file, 'utf-8');

        // embed CSS
        if (preloadCSS) {
          code = transformCSSProxy(file, code);
        }

        // minify if enabled
        if (options.minifyJS) {
          const minified = await esbuildService.transform(code, {minify: true, target});
          code = minified.code;
          fs.writeFileSync(file, code);
        }

        fs.writeFileSync(file, code);
        break;
      }
      case '.html': {
        const shouldOptimize = options.preloadCSS || options.preloadModules || options.minifyHTML;
        if (!shouldOptimize) return;

        let code = fs.readFileSync(file, 'utf-8');

        // preload CSS
        if (preloadCSS) {
          code = injectHTML(code, {
            headEnd: `<link rel="stylesheet" href="${options.preloadCSSFileName}" />\n`,
          });
        }

        // preload JS
        if (options.preloadModules) {
          code = preloadJS({code, file, preloadCSS, rootDir});
        }

        // minify
        if (options.minifyHTML) {
          code = minifyHtml(code, {
            collapseWhitespace: true,
            keepClosingSlash: true,
            removeComments: true,
          });
        }

        fs.writeFileSync(file, code, 'utf-8');
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
      let generatedFiles = {};

      // 1. index files
      const allFiles = glob
        .sync('**/*', {
          cwd: buildDirectory,
          ignore: [`${config.buildOptions.metaUrlPath}/*`],
          nodir: true,
        })
        .map((file) => path.join(buildDirectory, file)); // resolve to root dir

      // 2. scan imports
      const manifest = await scanHTML(
        allFiles.filter((f) => path.extname(f) === '.html'),
        buildDirectory,
      );
      let preloadCSS = false; // only bother preloading CSS if option is enabled AND there are .css.proxy.js files
      if (options.preloadCSS) {
        for (f in manifest) {
          if (
            manifest[f].js &&
            manifest[f].js.findIndex((js) => js.endsWith('.css.proxy.js')) !== -1
          ) {
            preloadCSS = true;
            break;
          }
        }
      }

      // 3. optimize all files in parallel
      const parallelWorkQueue = new PQueue({concurrency: CONCURRENT_WORKERS});
      allFiles
        .filter(
          (file) => (preloadCSS ? !file.endsWith('.css.proxy.js') : true), // if preloading CSS, don’t optimize .css.proxy.js files
        )
        .forEach((file) => {
          parallelWorkQueue.add(() =>
            optimizeFile({
              file,
              esbuildService,
              preloadCSS,
              rootDir: buildDirectory,
              target: options.target,
            }).catch((err) => {
              log(`Error: ${file} ${err.toString()}`, 'error');
            }),
          );
        });
      await parallelWorkQueue.onIdle();
      esbuildService.stop();

      // 5. build CSS file
      if (preloadCSS) {
        const combinedCSS = buildImportCSS(manifest, options.minifyCSS);
        const outputCSS = path.join(buildDirectory, options.preloadCSSFileName);
        await mkdirp(path.dirname(outputCSS));
        fs.writeFileSync(outputCSS, combinedCSS, 'utf-8');
        generatedFiles.preloadedCSS = outputCSS;
      }

      // 6. write manifest
      fs.writeFileSync(
        path.join(buildDirectory, config.buildOptions.metaUrlPath, 'optimize-manifest.json'),
        JSON.stringify(
          formatManifest({manifest, buildDirectory, generatedFiles, preloadCSS}),
          undefined,
          2, // prettify
        ),
        'utf-8',
      );
    },
  };
};
