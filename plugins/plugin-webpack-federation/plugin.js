const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const cwd = process.cwd();
const {ModuleFederationPlugin} = require('webpack').container;

module.exports = function plugin(config, args = {}) {
  // Validate: args.outputPattern
  args.outputPattern = args.outputPattern || {};
  const jsOutputPattern = args.outputPattern.js || 'federations/js/[name].[contenthash].js';
  const cssOutputPattern = args.outputPattern.css || 'federations/css/[name].[contenthash].css';
  const assetsOutputPattern = args.outputPattern.assets || 'federations/assets/[name]-[hash].[ext]';
  const federationConfig = args.federationConfig || {
    filename: 'remoteEntry.js',
    name: 'home',
    remotes: {
      home: 'home',
    },
    exposes: {},
  };
  if (!jsOutputPattern.endsWith('.js')) {
    throw new Error('Output Pattern for JS must end in .js');
  }
  if (!cssOutputPattern.endsWith('.css')) {
    throw new Error('Output Pattern for CSS must end in .css');
  }

  return {
    name: '@snowpack/plugin-webpack-federation',
    async optimize({buildDirectory, log}) {
      const tempBuildManifest = JSON.parse(
        await fs.readFileSync(path.join(cwd, 'package.json'), {
          encoding: 'utf-8',
        }),
      );
      const presetEnvTargets =
        tempBuildManifest.browserslist || '>0.75%, not ie 11, not UCAndroid >0, not OperaMini all';

      let extendConfig = (cfg) => cfg;
      if (typeof args.extendConfig === 'function') {
        extendConfig = args.extendConfig;
      } else if (typeof args.extendConfig === 'object') {
        extendConfig = (cfg) => ({...cfg, ...args.extendConfig});
      }

      //Compile files using webpack
      let webpackConfig = {
        context: buildDirectory,
        resolve: {
          alias: {
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
                  loader: 'babel-loader',
                  options: {
                    cwd: buildDirectory,
                    configFile: false,
                    babelrc: false,
                    compact: true,
                    presets: [
                      [
                        '@babel/preset-env',
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
                  loader: 'css-loader',
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
                  loader: 'css-loader',
                  options: {
                    modules: true,
                  },
                },
              ],
            },
            {
              test: /.*/,
              exclude: [/\.js?$/, /\.json?$/, /\.css$/],
              use: [
                {
                  loader: 'file-loader',
                  options: {
                    name: assetsOutputPattern,
                  },
                },
              ],
            },
          ],
        },
        mode: 'development',
        devtool: args.sourceMap ? 'source-map' : undefined,
      };

      const plugins = [
        new ModuleFederationPlugin(federationConfig),
        //Extract a css file from imported css files
        new MiniCssExtractPlugin({
          filename: cssOutputPattern,
        }),
      ];

      let entry = {};
      const extendedConfig = extendConfig({
        ...webpackConfig,
        plugins,
        entry,
        output: {
          path: buildDirectory,
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
          if (stats.hasErrors()) {
            const info = stats.toJson(extendedConfig.stats);
            console.error(info.warnings.join('\n-----\n'));
            console.error(info.errors.join('\n-----\n'));
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
    },
  };
};
