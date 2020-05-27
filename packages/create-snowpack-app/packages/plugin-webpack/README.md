# @snowpack/plugin-webpack

Use Webpack to bundle your application for production.

```
npm install --save-dev @snowpack/plugin-webpack
```

```js
// snowpack.config.json
{
  "plugins": [["@snowpack/plugin-webpack", { /* see "Plugin Options" below */}]]
}
```

#### Default Build Script

```js
{
  "scripts": {"bundle:*": "@snowpack/plugin-webpack"}
}
```

### Limitations

Currently only works for Single Page Applications (SPA) with a single HTML entrypoint. See https://github.com/pikapkg/create-snowpack-app/issues/74 for more info.

### Plugin Options

- `sourceMap: boolean` - Enable sourcemaps in the bundled output.
- `outputPatterns: {css: string, js: string, assets: string}` - Set the URL for your final bundled files. This is where they will be written to disk in the `build/` directory. See Webpack's [`output.filename`](https://webpack.js.org/configuration/output/#outputfilename) documentation for examples of valid values.
- `extendConfig: (config: WebpackConfig) => WebpackConfig` - extend your webpack config, see below.

#### Extending The Default Webpack Config

The `extendConfig` option is a function that you can provide to configure the default webpack config. If you provide this function, the plugin will pass its return value to `webpack.compile()`. Use this to make changes, add plugins, configure loaders, etc.

Note that this requires you use a `snowpack.config.js` JavaScript config file. JSON configuration cannot represent a function.

```js
// snowpack.config.js
module.exports = {
  plugins: [
    [
      "@snowpack/plugin-webpack",
      {
        extendConfig: (config) => {
          config.plugins.push(/* ... */);
          return config;
        },
      },
    ],
  ],
};
```
