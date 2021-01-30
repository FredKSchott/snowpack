# @snowpack/plugin-sass

This plugin adds [Sass](https://sass-lang.com/) support to any Snowpack project. With this plugin, you can import any `*.scss` or `*.sass` Sass file from JavaScript and have it compile to CSS.

This plugin also adds support for `.module.scss` Sass Modules. [Learn more.](https://www.snowpack.dev/reference/supported-files)

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
    [
      '@snowpack/plugin-sass',
      {
        /* see options below */
      },
    ],
  ],
};
```

## Plugin Options

| Name                |   Type    | Description                                                                                                                                                                                                                                                                              |
| :------------------ | :-------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `native`            | `boolean` | If `true`, the plugin will ignore the npm version of sass installed locally for the native Sass CLI [installed separately](https://sass-lang.com/install). This involves extra setup, but the result can be [up to 9× faster.](https://stackoverflow.com/a/56422541) (default: `false`). |
| `compilerOptions.*` | `object`  | Pass [Sass options][sass-options] directly to the Sass compiler (see `compilerOptions`).                                                                                                                                                                                                 |

### `compilerOptions`

These options are camelCased equivalents of the [Sass CLI Options][sass-options]. The options listed here are safe for use. The other flags not listed here may cause issues or conflicts with Snowpack and/or other plugins; use at your discretion.

| Name             |              Type              | Description                                                                                             |
| :--------------- | :----------------------------: | :------------------------------------------------------------------------------------------------------ |
| `loadPath`       |       `string, string[]`       | Add directories to Sass's load path, to support looking up and loading partials (etc.) by name.         |
| `style`          | `'expanded'` \| `'compressed'` | The output style. Specify `'compressed'` to enable Sass’ built-in minification (default: `'expanded'`). |
| `sourceMap`      |           `boolean`            | Enable / disable source maps (default: `true`).                                                         |
| `sourceMapUrls`  |  `'relative'` \| `'absolute'`  | How to link from source maps to source files (default: `'relative'`).                                   |
| `embedSources`   |           `boolean`            | Embed source file contents in source maps (default: `false`).                                           |
| `embedSourceMap` |           `boolean`            | Embed source map contents in CSS (default: `false`).                                                    |
| `charset`        |           `boolean`            | Emit a `@charset` or BOM for CSS with non-ASCII characters. (default: `true`).                          |
| `update`         |           `boolean`            | Compile only out-of-date stylesheets (default: `false`).                                                |

[sass-options]: https://sass-lang.com/documentation/cli/dart-sass#options
