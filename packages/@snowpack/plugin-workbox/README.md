# @snowpack/plugin-workbox

<!-- Use Webpack to bundle your application for production. -->

```
npm install --save-dev @snowpack/plugin-workbox
```

```js
// snowpack.config.json
{
  "plugins": [["@snowpack/plugin-workbox", { /* see "Plugin Options" below */}]]
}
```


### Plugin Options
<!-- 
- `sourceMap: boolean` - Enable sourcemaps in the bundled output.
- `outputPattern: {css: string, js: string, assets: string}` - Set the URL for your final bundled files. This is where they will be written to disk in the `build/` directory. See Webpack's [`output.filename`](https://webpack.js.org/configuration/output/#outputfilename) documentation for examples of valid values.
- `extendConfig: (config: WebpackConfig) => WebpackConfig` - extend your webpack config, see below. -->