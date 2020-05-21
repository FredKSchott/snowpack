const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const jsdom = require("jsdom");
const CopyPlugin = require("copy-webpack-plugin");
const { JSDOM } = jsdom;

async function compilePromise(webpackConfig) {
  const compiler = webpack(webpackConfig);
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (stats.hasErrors()) {
        reject(err);
      }
      resolve(stats);
    });
  });
}

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
  return {
    async bundle({ srcDirectory, destDirectory, log, jsFilePaths }) {
      let homepage = config.homepage || "/";
      let fallback = chain(config, ["devOptions", "fallback"]) || "index.html";

      const jsOutputPattern =
        chain(args, ["outputPatterns", "js"]) || "js/bundle-[hash].js";
      const cssOutputPattern =
        chain(args, ["outputPatterns", "css"]) || "css/style-[hash].css";
      const assetsOutputPattern =
        chain(args, ["outputPatterns", "assets"]) ||
        "assets/[name]-[hash].[ext]";

      if (!jsOutputPattern.endsWith(".js")) {
        throw new Error("Output Pattern for JS must end in .js");
      }
      if (!cssOutputPattern.endsWith(".css")) {
        throw new Error("Output Pattern for CSS must end in .css");
      }

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
        resolve: {
          alias: {
            "/web_modules": path.join(srcDirectory, "web_modules/"),
          },
        },
        module: {
          rules: [
            {
              test: /\.jsx?$/,
              exclude: ["/node_modules/"],
              use: {
                loader: "babel-loader",
              },
            },
            {
              test: /\.s?css$/,
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
              exclude: [/\.jsx?$/, /\.s?css$/],
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
        mode: args.mode || "production",
        devtool: args.sourceMap ? "source-map" : undefined,
        optimization: Object.keys(args).includes("minify")
          ? {
              minimize: args.minify,
            }
          : undefined,
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
                    path.join(srcDirectory, fallback),
                    "**/_dist_/**",
                    "**/web_modules/**",
                  ],
                },
              },
            ],
          }),
        ],
      };

      const stats = await compilePromise(
        extendConfig({
          ...webpackConfig,
          entry: path.join(srcDirectory, entryPoint),
          output: {
            path: destDirectory,
            filename: jsOutputPattern,
          },
        })
      ).catch((err) => {
        console.log(err);
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
        fs.writeFileSync(path.join(destDirectory, fallback), dom.serialize());
      }
    },
  };
};
