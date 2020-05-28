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

function chain(object, keys) {
  let cur = object;
  for (const key of keys) {
    if (Object.keys(cur).includes(key)) {
      cur = cur[key];
    } else {
      return undefined;
    }
  }
  return cur;
}

module.exports = function plugin(config, args) {
  // Deprecated: args.mode
  if (args.mode && args.mode !== "production") {
    throw new Error("args.mode support has been removed.");
  }
  // Validate: args.outputPattern
  args.outputPattern = args.outputPattern || {};
  const jsOutputPattern = args.outputPattern.js || "js/bundle-[hash].js";
  const cssOutputPattern = args.outputPattern.css || "css/style-[hash].css";
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
      let homepage = config.homepage || "/";
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

      //Find the first local script, assume it's the entrypoint
      let scriptEl;
      for (const el of Array.from(
        dom.window.document.querySelectorAll("script")
      )) {
        let src = el.src.trim();
        if (
          el.type.trim().toLowerCase() === "module" &&
          !src.trim().match(/[a-zA-Z+]+:\/\//g)
        ) {
          scriptEl = el;
          break;
        }
      }
      if (!scriptEl) {
        throw new Error("Can't bundle without script tag in html");
      }
      let entryPoint = scriptEl.src;

      //Compile files using webpack
      let webpackConfig = {
        context: srcDirectory,
        resolve: {
          alias: {
            "/web_modules": path.join(srcDirectory, "web_modules/"),
          },
        },
        module: {
          rules: [
            {
              test: /\.js$/,
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
                        { targets: presetEnvTargets, bugfixes: true },
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
              exclude: [/\.js?$/, /\.css$/],
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

      const compiler = webpack(
        extendConfig({
          ...webpackConfig,
          entry: path.join(srcDirectory, entryPoint),
          output: {
            path: destDirectory,
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
            console.error(infoWarnings.join("\n-----\n"));
            console.error(infoErrors.join("\n-----\n"));
          }
          resolve(stats);
        });
      });

      if (!args.skipFallbackOutput) {
        let assetFiles =
          chain(
            stats.toJson({
              assets: false,
              hash: true,
            }),
            ["entrypoints", "main", "assets"]
          ) || [];

        let jsFile = assetFiles.find((d) => d.endsWith(".js"));
        let cssFile = assetFiles.find((d) => d.endsWith(".css"));

        //Now that webpack is done, modify the html file to point to the newly compiled resources
        scriptEl.src = path.join(homepage, jsFile);

        if (cssFile) {
          let csslink = dom.window.document.createElement("link");
          csslink.setAttribute("rel", "stylesheet");
          csslink.href = path.join(homepage, cssFile);
          dom.window.document.querySelector("head").append(csslink);
        }

        //And write our modified html file out to the destination
        fs.writeFileSync(
          path.join(destDirectory, config.devOptions.fallback),
          dom.serialize()
        );
      }
    },
  };
};
