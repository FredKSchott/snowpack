# @snowpack/plugin-optimize

Optimize your unbundled Snowpack app:

- ✅ Transpile JS
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
| `target` | `string | string[]` | The language target(s) to transpile to. This can be a single string (ex: "es2018") or an array of strings (ex: ["chrome58","firefox57"]). If undefined, no transpilation will be done. See [esbuild documentation](https://github.com/evanw/esbuild) for more. |

[modulepreload]: https://developers.google.com/web/updates/2017/12/modulepreload
