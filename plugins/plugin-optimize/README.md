# @snowpack/plugin-optimize

Optimize your unbundled Snowpack app:

- ✅ Minify HTML
- ✅ Minify CSS
- ✅ Minify JS
- ✅ Transpile JS
- ✅ [Preload JS Modules][https://developers.google.com/web/updates/2017/12/modulepreload]

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
    ["@snowpack/plugin-optimize", { /* see options below */ }]
  ]
}
```

### Plugin Options

| Name             |       Type        | Description                                                                                                                                                                                                                                                    |
| :--------------- | :---------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minifyJS`       |     `boolean`     | Enable JS minification (default: `true`)                                                                                                                                                                                                                       |
| `minifyCSS`      |     `boolean`     | Enable CSS minification (default: `true`)                                                                                                                                                                                                                      |
| `minifyHTML`     |     `boolean`     | Enable HTML minification (default: `true`)                                                                                                                                                                                                                     |
| `preloadModules` |     `boolean`     | Experimental: Add deep, optimized [`<link rel="modulepreload">`](https://developers.google.com/web/updates/2017/12/modulepreload) tags into your HTML. (default: `false`)                                                                                      |
| `target`         | `string,string[]` | The language target(s) to transpile to. This can be a single string (ex: "es2018") or an array of strings (ex: ["chrome58","firefox57"]). If undefined, no transpilation will be done. See [esbuild documentation](https://github.com/evanw/esbuild) for more. |
