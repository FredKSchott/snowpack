# @snowpack/plugin-optimize

Optimize your unbundled Snowpack app:

- ✅ Minify JS
- ✅ [Preload JS Modules][modulepreload]
- (Coming soon) Minify HTML
- (Coming soon) Minify CSS

### Usage

From a terminal, run the following:

```
npm install --save-dev @snowpack/plugin-optimize
```

Then add this plugin to your Snowpack config:

```js
// snowpack.config.json
{
  "plugins": [
    [
      "@snowpack/plugin-optimize",
      {
        minifyJS: true, // default
        preloadModules: true, // default
      }
    ]
  ]
}
```

### Plugin Options

| Name             |   Type    | Description                                                     |
| :--------------- | :-------: | :-------------------------------------------------------------- |
| `minifyJS`       | `boolean` | Should JS be minified? (default: `true`)                        |
| `preloadModules` | `boolean` | Should static `import`s be preloaded in HTML? (default: `true`) |

[modulepreload]: https://developers.google.com/web/updates/2017/12/modulepreload
