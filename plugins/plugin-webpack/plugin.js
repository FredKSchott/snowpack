const crypto = require('crypto');
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const util = require('util');
const url = require('url');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const {WebpackManifestPlugin} = require('webpack-manifest-plugin');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;
const minify = require('html-minifier').minify;

function insertBefore(newNode, existingNode) {
  existingNode.parentNode.insertBefore(newNode, existingNode);
}

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

function parseHTMLFiles({buildDirectory}) {
  // Get all html files from the output folder
  const pattern = buildDirectory + '/**/*.html';
  const htmlFiles = glob.sync(pattern).map((htmlPath) => path.relative(buildDirectory, htmlPath));

  const doms = {};
  const jsEntries = {};
  for (const htmlFile of htmlFiles) {
    const dom = new JSDOM(fs.readFileSync(path.join(buildDirectory, htmlFile)));

    //Find all local script, use it as the entrypoint
    const scripts = Array.from(dom.window.document.querySelectorAll('script'))
      .filter((el) => el.type.trim().toLowerCase() === 'module')
      .filter((el) => !/^[a-zA-Z]+:\/\//.test(el.src));

    for (const el of scripts) {
      const src = el.src.trim();
      const parsedPath = path.parse(src);

      // Using path + filename to avoid problems if files have the same name, i.e.
      // /index.js and /admin/index.js
      const name = path
        .join(parsedPath.dir, parsedPath.name)
        .replace(/\\/g, '/')
        // Paths other than the root will have a leading separator
        .replace(/^\//, '');

      if (!(name in jsEntries)) {
        jsEntries[name] = {
          path: path.join(buildDirectory, src),
          occurrences: [],
        };
      }
      jsEntries[name].occurrences.push({script: el, dom});
    }

    doms[htmlFile] = dom;
  }
  return {doms, jsEntries};
}

function emitHTMLFiles({doms, jsEntries, stats, baseUrl, outputDirectory, htmlMinifierOptions}) {
  const entrypoints = stats.toJson({assets: false, hash: true}).entrypoints;

  //Now that webpack is done, modify the html files to point to the newly compiled resources
  Object.keys(jsEntries).forEach((name) => {
    if (entrypoints[name] !== undefined && entrypoints[name]) {
      const assetFiles = entrypoints[name].assets || [];
      const jsFiles = assetFiles.filter((d) => d.name.endsWith('.js'));
      const cssFiles = assetFiles.filter((d) => d.name.endsWith('.css'));

      for (const occurrence of jsEntries[name].occurrences) {
        const originalScriptEl = occurrence.script;
        const dom = occurrence.dom;
        const head = dom.window.document.querySelector('head');

        for (const jsFile of jsFiles) {
          // Clone node so we keep original attributes, and remove
          // `type=module` as that is not needed
          const scriptEl = originalScriptEl.cloneNode();
          scriptEl.removeAttribute('type');
          scriptEl.src = url.parse(baseUrl).protocol
            ? url.resolve(baseUrl, jsFile.name)
            : path.posix.join(baseUrl, jsFile.name);
          // insert _before_ so the relative order of these scripts is maintained
          insertBefore(scriptEl, originalScriptEl);
        }
        for (const cssFile of cssFiles) {
          const linkEl = dom.window.document.createElement('link');
          linkEl.setAttribute('rel', 'stylesheet');
          linkEl.href = url.parse(baseUrl).protocol
            ? url.resolve(baseUrl, cssFile.name)
            : path.posix.join(baseUrl, cssFile.name);
          head.append(linkEl);
        }
        originalScriptEl.remove();
      }
    }
  });

  //And write our modified html files out to the destination
  for (const [htmlFile, dom] of Object.entries(doms)) {
    const html = htmlMinifierOptions
      ? minify(dom.serialize(), htmlMinifierOptions)
      : dom.serialize();

    const outputFile = path.join(outputDirectory, htmlFile);
    // If the user specified a different output, we may not have an existing folder structure
    ensureDirectoryExists(path.dirname(outputFile))
    fs.writeFileSync(outputFile, html);
  }
}

function getSplitChunksConfig({numEntries}) {
  const isCss = (module) => module.type === `css/mini-extract`;
  /**
   * Implements a version of granular chunking, as described at https://web.dev/granular-chunking-nextjs/.
   */
  return {
    chunks: 'all',
    maxInitialRequests: 25,
    minSize: 20000,
    cacheGroups: {
      default: false,
      vendors: false,
      /**
       * NPM libraries larger than 100KB are pulled into their own chunk
       *
       * We use a smaller cutoff than the reference implementation (which does 150KB),
       * because our babel-loader config compresses whitespace with `compact: true`.
       */
      lib: {
        test(module) {
          return (
            !isCss(module) &&
            module.size() > 100000 &&
            /_snowpack[/\\]pkg[/\\]/.test(module.identifier())
          );
        },
        name(module) {
          /**
           * Name the chunk based on the filename in /pkg/*.
           *
           * E.g. /pkg/moment.js -> lib-moment.HASH.js
           */
          const ident = module.libIdent({context: 'dir'});
          const lastItem = ident
            .split('/')
            .reduceRight((item) => item)
            .replace(/\.js$/, '');
          return `lib-${lastItem}`;
        },
        priority: 30,
        minChunks: 1,
        reuseExistingChunk: true,
      },
      // modules used by all entrypoints end up in commons
      commons: {
        test(module) {
          return !isCss(module);
        },
        name: 'commons',
        // don't create a commons chunk until there are 2+ entries
        minChunks: Math.max(2, numEntries),
        priority: 20,
      },
      // modules used by multiple chunks can be pulled into shared chunks
      shared: {
        test(module) {
          return !isCss(module);
        },
        name(module, chunks) {
          const hash = crypto
            .createHash(`sha1`)
            .update(chunks.reduce((acc, chunk) => acc + chunk.name, ``))
            .digest(`hex`);

          return hash;
        },
        priority: 10,
        minChunks: 2,
        reuseExistingChunk: true,
      },
      // Bundle all css & lazy css into one stylesheet to make sure lazy components do not break
      styles: {
        test(module) {
          return isCss(module);
        },
        name: `styles`,
        priority: 40,
        enforce: true,
      },
    },
  };
}

function getPresetEnvTargets({browserslist}) {
  if (Array.isArray(browserslist) || typeof browserslist === 'string') {
    return browserslist;
  } else if (typeof browserslist === 'object' && 'production' in browserslist) {
    return browserslist.production;
  } else {
    return '>0.75%, not ie 11, not UCAndroid >0, not OperaMini all';
  }
}

module.exports = function plugin(config, args = {}) {
  // Deprecated: args.mode
  if (args.mode && args.mode !== 'production') {
    throw new Error('args.mode support has been removed.');
  }
  // Validate: args.outputPattern
  args.outputPattern = args.outputPattern || {};
  const jsOutputPattern = args.outputPattern.js || 'js/[name].[contenthash].js';
  const cssOutputPattern = args.outputPattern.css || 'css/[name].[contenthash].css';
  const assetsOutputPattern = args.outputPattern.assets || 'assets/[name].[contenthash][ext]';
  if (!jsOutputPattern.endsWith('.js')) {
    throw new Error('Output Pattern for JS must end in .js');
  }
  if (!cssOutputPattern.endsWith('.css')) {
    throw new Error('Output Pattern for CSS must end in .css');
  }

  // Default options for HTMLMinifier
  // https://github.com/kangax/html-minifier#options-quick-reference
  const defaultHtmlMinifierOptions = {
    collapseWhitespace: true,
    removeComments: true,
    removeEmptyAttributes: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
  };

  const htmlMinifierOptions =
    args.htmlMinifierOptions === false
      ? false
      : Object.assign({}, defaultHtmlMinifierOptions, args.htmlMinifierOptions);

  const manifest =
    typeof args.manifest === 'string'
      ? args.manifest
      : !!args.manifest
      ? './asset-manifest.json'
      : undefined;

  // Webpack handles minification for us, so its safe to always
  // disable Snowpack's default minifier.
  config.buildOptions.minify = false;
  // Webpack creates unique file hashes for all generated bundles,
  // so we clean the build directory before building to remove outdated
  // build artifacts.
  config.buildOptions.clean = true;

  return {
    name: '@snowpack/plugin-webpack',
    async optimize({buildDirectory, log}) {
      const buildOptions = config.buildOptions || {};
      let baseUrl = buildOptions.baseUrl || '/';
      const tempBuildManifest = JSON.parse(
        await fs.readFileSync(path.join(config.root || process.cwd(), 'package.json'), {
          encoding: 'utf-8',
        }),
      );
      const presetEnvTargets = getPresetEnvTargets(tempBuildManifest);

      let extendConfig = (cfg) => cfg;
      if (typeof args.extendConfig === 'function') {
        extendConfig = args.extendConfig;
      } else if (typeof args.extendConfig === 'object') {
        extendConfig = (cfg) => ({...cfg, ...args.extendConfig});
      }

      const {doms, jsEntries} = parseHTMLFiles({buildDirectory});

      if (Object.keys(jsEntries).length === 0) {
        throw new Error("Can't bundle without script tag in html");
      }

      //Compile files using webpack
      let webpackConfig = {
        context: buildDirectory,
        resolve: {
          alias: {
            // TODO: Support a custom config.buildOptions.metaUrlPath
            '/_snowpack': path.join(buildDirectory, '_snowpack'),
            '/__snowpack__': path.join(buildDirectory, '__snowpack__'),
            '/web_modules': path.join(buildDirectory, 'web_modules'),
          },
        },
        module: {
          rules: [
            {
              test: /\.js$/,
              exclude: /node_modules/,
              use: [
                {
                  loader: require.resolve('babel-loader'),
                  options: {
                    cwd: buildDirectory,
                    configFile: false,
                    babelrc: false,
                    compact: true,
                    presets: [
                      [
                        require.resolve('@babel/preset-env'),
                        {
                          targets: presetEnvTargets,
                          bugfixes: true,
                          modules: false,
                          useBuiltIns: 'usage',
                          corejs: 3,
                        },
                      ],
                    ],
                  },
                },
                {
                  loader: require.resolve('./plugins/import-meta-fix.js'),
                },
                {
                  loader: require.resolve('./plugins/proxy-import-resolve.js'),
                },
              ],
            },
            {
              test: /\.css$/,
              exclude: /\.module\.css$/,
              use: [
                {
                  loader: MiniCssExtractPlugin.loader,
                },
                {
                  loader: require.resolve('css-loader'),
                },
              ],
            },
            {
              test: /\.module\.css$/,
              use: [
                {
                  loader: MiniCssExtractPlugin.loader,
                },
                {
                  loader: require.resolve('css-loader'),
                  options: {
                    modules: true,
                  },
                },
              ],
            },
            {
              test: /.*/,
              exclude: [/\.js?$/, /\.json?$/, /\.css$/],
              // When using old assets loaders (i.e. file-loader/url-loader/raw-loader)
              // make sure to set 'javascript/auto' flag
              // https://webpack.js.org/guides/asset-modules/
              type: 'asset/resource',
              generator: {
                filename: assetsOutputPattern,
              },
            },
          ],
        },
        mode: 'production',
        devtool: args.sourceMap ? 'source-map' : undefined,
        optimization: {
          // extract webpack runtime to its own chunk: https://webpack.js.org/concepts/manifest/#runtime
          runtimeChunk: {
            name: `webpack-runtime`,
          },
          splitChunks: getSplitChunksConfig({numEntries: Object.keys(jsEntries).length}),
          minimizer: [
            `...`, // extends webpack internal ones (i.e. `terser-webpack-plugin`)
            new CssMinimizerPlugin({}),
          ],
        },
      };
      const plugins = [
        //Extract a css file from imported css files
        new MiniCssExtractPlugin({
          filename: cssOutputPattern,
        }),
      ];
      if (manifest) {
        plugins.push(new WebpackManifestPlugin({fileName: manifest}));
      }

      let entry = {};
      for (name in jsEntries) {
        entry[name] = jsEntries[name].path;
      }
      const extendedConfig = extendConfig({
        ...webpackConfig,
        plugins,
        entry,
        output: {
          path: buildDirectory,
          publicPath: baseUrl,
          filename: jsOutputPattern,
        },
      });
      const compiler = webpack(extendedConfig);

      const stats = await new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
          if (err) {
            reject(err);
            return;
          }
          const info = stats.toJson(extendedConfig.stats);
          if (stats.hasErrors()) {
            console.error(
              'Webpack errors:\n' + info.errors.map((err) => err.message).join('\n-----\n'),
            );
            reject(Error(`Webpack failed with ${info.errors} error(s).`));
            return;
          }
          if (stats.hasWarnings()) {
            console.error(
              'Webpack warnings:\n' + info.warnings.map((err) => err.message).join('\n-----\n'),
            );
            if (args.failOnWarnings) {
              reject(Error(`Webpack failed with ${info.warnings} warnings(s).`));
              return;
            }
          }
          resolve(stats);
        });
      });

      if (extendedConfig.stats !== 'none') {
        console.log(
          stats.toString(
            extendedConfig.stats
              ? extendedConfig.stats
              : {
                  colors: true,
                  all: false,
                  assets: true,
                },
          ),
        );
      }

      // If the user specified a path, we need to put the HTML there too
      const outputDirectory = extendedConfig.output.path;

      emitHTMLFiles({
        doms,
        jsEntries,
        stats,
        baseUrl,
        outputDirectory,
        htmlMinifierOptions,
      });
    },
  };
};
