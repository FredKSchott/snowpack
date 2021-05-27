# @snowpack/plugin-vue

Use the [Vue 3 compiler](https://www.npmjs.com/package/@vue/compiler-sfc) to build your `.vue` SFC files from source.

```
npm install --save-dev @snowpack/plugin-vue
```

```js
// snowpack.config.mjs
export default {
  plugins: [
    '@snowpack/plugin-vue',
    {
      /* see optional “Plugin Options” below */
    },
  ],
};
```

## Plugin Options

You may customize Vue's bundler behavior using the following plugin options.

| Name           |   Type    | Description                                                                                          |
| :------------- | :-------: | :--------------------------------------------------------------------------------------------------- |
| `optionsApi`   | `boolean` | Enable/disable [Options API](https://v3.vuejs.org/api/options-api.html) support. Defaults to `true`. |
| `prodDevtools` | `boolean` | Enable/disable devtools support in production. Defaults to `false`.                                  |
