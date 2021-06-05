# @snowpack/plugin-postcss

Run [PostCSS](https://github.com/postcss/postcss) on all `.css` files, including ones generated from Sass, Vue, and Svelte.

### Usage

From a terminal, run the following:

```
npm install --save-dev @snowpack/plugin-postcss postcss
```

Then add this plugin to your Snowpack config:

```js
// snowpack.config.mjs
export default {
  plugins: ['@snowpack/plugin-postcss'],
};
```

Lastly, add a `postcss.config.js` file to the root of your project as you would normally:

```js
const cssnano = require('cssnano');
const postcssPresetEnv = require('postcss-preset-env');

module.exports = {
  plugins: [cssnano(), postcssPresetEnv()],
};
```

### Plugin Options

| Name     |        Type        | Description                                                                       |
| :------- | :----------------: | :-------------------------------------------------------------------------------- |
| `input`  |     `string[]`     | File extensions to transform (default: `['.css']`)                                |
| `config` | `string \| object` | (optional) Pass in a PostCSS config object or path to your PostCSS config on disk |
