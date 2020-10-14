# @snowpack/plugin-sass

This plugin adds [Sass](https://sass-lang.com/) support to any Snowpack project. With this plugin, you can import any `*.scss` or `*.sass` Sass file from JavaScript and have it compile to CSS.

This plugin also adds support for `.module.scss` Sass Modules. [Learn more.](https://www.snowpack.dev/#import-css-modules)

#### A Note on Sass Implementations

Sass is interesting in that multiple compilers are available: [sass](https://www.npmjs.com/package/sass) (written in Dart) & [node-sass](https://www.npmjs.com/package/node-sass) (written in JavaScript). Both packages run on Node.js and both are popular on npm. However, [node-sass is now considered deprecated](https://github.com/sass/node-sass/issues/2952).

**This plugin was designed to work with the `sass` package.** `sass` is automatically installed with this plugin as a direct dependency, so no extra effort is required on your part.

## Usage

```bash
npm i @snowpack/plugin-sass
```

Then add the plugin to your Snowpack config:

```js
// snowpack.config.js

module.exports = {
  plugins: [
    ['@snowpack/plugin-sass', { /* see options below */ }
  ],
};
```

## Plugin Options

| Name             |                   Type                   | Description                                                                                                                                                                                                                                                                            |
| :--------------- | :--------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `native`         |                `boolean`                 | If true, the plugin will ignore the npm version of sass installed locally for the native Sass CLI [installed separately](https://sass-lang.com/install). This involves extra set up, but the result can be [up to 9x faster.](https://stackoverflow.com/a/56422541) Defaults to false. |
| `style`          | `'expanded'` (default) \| `'compressed'` | The output style. Specify `'compressed'` to enable Sass’ built-in minification (default: `'expanded'`).                                                                                                                                                                                |
| `sourceMap`      |                `boolean`                 | Enable / disable source maps (default: `true`).                                                                                                                                                                                                                                        |
| `sourceMapUrls`  |        `'relative'` \| `absolute`        | How to link from source maps to source files (default: `'relative'`).                                                                                                                                                                                                                  |
| `embedSources`   |                `boolean`                 | Embed source file contents in source maps (default: `false`).                                                                                                                                                                                                                          |
| `embedSourceMap` |                `boolean`                 | Embed source map contents in CSS (default: `false`).                                                                                                                                                                                                                                   |
| `charset`        |                `boolean`                 | Emit a `@charset` or BOM for CSS with non-ASCII characters. (defaul: `true`).                                                                                                                                                                                                          |
| `update`         |                `boolean`                 | Only compile out-of-date stylesheets (default: `false`).                                                                                                                                                                                                                               |
