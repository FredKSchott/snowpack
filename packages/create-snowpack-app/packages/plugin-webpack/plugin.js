const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserJSPlugin = require("terser-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const jsdom = require("jsdom");
const CopyPlugin = require("copy-webpack-plugin");
const { JSDOM } = jsdom;
const cwd = process.cwd();

function insertAfter(newNode, existingNode) {
  existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

module.exports = function plugin(config, args) {
  // Deprecated: args.mode
  if (args.mode && args.mode !== "production") {
    throw new Error("args.mode support has been removed.");
  }
  // Validate: args.outputPattern
  args.outputPattern = args.outputPattern || {};
  const jsOutputPattern = args.outputPattern.js || "js/[name].[contenthash].js";
  const cssOutputPattern =
    args.outputPattern.css || "css/[name].[contenthash].css";
  const assetsOutputPattern =
    args.outputPattern.assets || "assets/[name]-[hash].[ext]";
  if (!jsOutputPattern.endsWith(".js")) {
    throw new Error("Output Pattern for JS must end in .js");
  }
  if (!cssOutputPattern.endsWith(".css")) {
    throw new Error("Output Pattern for CSS must end in .css");
  }

  return {
    defaultBuildScript: "bundle:*",
    async bundle({ srcDirectory, destDirectory, log, jsFilePaths }) {
      // config.homepage is legacy, remove in future version
      const buildOptions = config.buildOptions || {};
      let baseUrl = buildOptions.baseUrl || config.homepage || "/";
      const tempBuildManifest = JSON.parse(
        await fs.readFileSync(path.join(cwd, "package.json"), {
          encoding: "utf-8",
        })
      );
      const presetEnvTargets =
        tempBuildManifest.browserslist ||
        ">0.75%, not ie 11, not UCAndroid >0, not OperaMini all";

      let extendConfig = (cfg) => cfg;
      if (typeof args.extendConfig === "function") {
        extendConfig = args.extendConfig;
      } else if (typeof args.extendConfig === "object") {
        extendConfig = (cfg) => ({ ...cfg, ...args.extendConfig });
      }

      let dom = new JSDOM(
        fs.readFileSync(path.join(srcDirectory, config.devOptions.fallback))
      );

      //Find all local script, use it as the entrypoint
      const scripts = Array.from(dom.window.document.querySelectorAll("script"))
        .filter((el) => el.type.trim().toLowerCase() === "module")
        .filter((el) => !/^[a-zA-Z]+:\/\//.test(el.src));

      if (scripts.length === 0) {
        throw new Error("Can't bundle without script tag in html");
      }

      const entries = {};
      for (const el of scripts) {
        const src = el.src.trim();
        const parsedPath = path.parse(src);
        const name = parsedPath.name;
        if (entries.name !== undefined) {
          throw new Error(`Duplicate script with name ${name}.`);
        }
        entries[name] = { path: path.join(srcDirectory, src), script: el };
      }

      //Compile files using webpack
      let webpackConfig = {
        context: srcDirectory,
        resolve: {
          alias: {
            "/__snowpack__": path.join(srcDirectory, "__snowpack__"),
            "/web_modules": path.join(srcDirectory, "web_modules"),
          },
        },
        module: {
          rules: [
            {
              test: /\.js$/,
              exclude: /node_modules/,
              use: [
                {
                  loader: "babel-loader",
                  options: {
                    cwd: srcDirectory,
                    configFile: false,
                    babelrc: false,
                    presets: [
                      [
                        "@babel/preset-env",
                        {
                          targets: presetEnvTargets,
                          bugfixes: true,
                          modules: false,
                          useBuiltIns: "usage",
                          corejs: 3,
                        },
                      ],
                    ],
                  },
                },
                {
                  // TODO: replace with "@open-wc/webpack-import-meta-loader"
                  // https://github.com/open-wc/open-wc/pull/1677
                  loader: require.resolve("./import-meta-plugin/plugin.js"),
                },
              ],
            },
            {
              test: /\.css$/,
              use: [
                {
                  loader: MiniCssExtractPlugin.loader,
                },
                {
                  loader: "css-loader",
                },
              ],
            },
            {
              test: /.*/,
              exclude: [/\.js?$/, /\.json?$/, /\.css$/],
              use: [
                {
                  loader: "file-loader",
                  options: {
                    name: assetsOutputPattern,
                  },
                },
              ],
            },
          ],
        },
        mode: "production",
        devtool: args.sourceMap ? "source-map" : undefined,
        optimization: {
          minimizer: [new TerserJSPlugin({}), new OptimizeCSSAssetsPlugin({})],
        },
        plugins: [
          //Extract a css file from imported css files
          new MiniCssExtractPlugin({
            filename: cssOutputPattern,
          }),
          //Copy other files to the destination, excluding ones that are no longer useful
          new CopyPlugin({
            patterns: [
              {
                from: srcDirectory,
                to: destDirectory,
                globOptions: {
                  ignore: [
                    path.join(srcDirectory, config.devOptions.fallback),
                    "**/_dist_/**",
                    "**/web_modules/**",
                  ],
                },
                noErrorOnMissing: true,
              },
            ],
          }),
        ],
      };
      let entry = {};
      for (name in entries) {
        entry[name] = entries[name].path;
      }
      const compiler = webpack(
        extendConfig({
          ...webpackConfig,
          entry,
          output: {
            path: destDirectory,
            publicPath: baseUrl,
            filename: jsOutputPattern,
          },
        })
      );

      const stats = await new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
          if (err) {
            reject(err);
            return;
          }
          if (stats.hasErrors()) {
            const info = stats.toJson();
            console.error(info.warnings.join("\n-----\n"));
            console.error(info.errors.join("\n-----\n"));
          }
          resolve(stats);
        });
      });

      console.log(
        stats.toString({
          colors: true,
          all: false,
          assets: true,
        })
      );

      if (!args.skipFallbackOutput) {
        const entrypoints = stats.toJson({ assets: false, hash: true })
          .entrypoints;

        //Now that webpack is done, modify the html file to point to the newly compiled resources
        Object.keys(entries).forEach((name) => {
          const originalScriptEl = entries[name].script;
          if (entrypoints[name] !== undefined && entrypoints[name]) {
            const assetFiles = entrypoints[name].assets || [];
            const jsFiles = assetFiles.filter((d) => d.endsWith(".js"));
            const cssFiles = assetFiles.filter((d) => d.endsWith(".css"));
            for (const jsFile of jsFiles) {
              const scriptEl = dom.window.document.createElement("script");
              scriptEl.src = path.posix.join(baseUrl, jsFile);
              insertAfter(scriptEl, originalScriptEl);
            }
            for (const cssFile of cssFiles) {
              const linkEl = dom.window.document.createElement("link");
              linkEl.setAttribute("rel", "stylesheet");
              linkEl.href = path.posix.join(baseUrl, cssFile);
              dom.window.document.querySelector("head").append(linkEl);
            }
            originalScriptEl.remove();
          }
        });

        //And write our modified html file out to the destination
        fs.writeFileSync(
          path.join(destDirectory, config.devOptions.fallback),
          dom.serialize()
        );
      }
    },
  };
};
