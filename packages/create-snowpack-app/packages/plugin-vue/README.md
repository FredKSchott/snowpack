# @snowpack/plugin-vue

Use the [Vue 3 compiler](https://www.npmjs.com/package/@vue/compiler-sfc) to build your `.vue` SFC files from source.

```
npm install --save-dev @snowpack/plugin-vue
```

```js
// snowpack.config.json
{
  "plugins": [["@snowpack/plugin-vue", { /* see "Plugin Options" below */}]]
}
```

#### Default Build Script

```js
{
  // Matches all ".vue" files
  "scripts": {"build:vue": "@snowpack/plugin-vue"}
}
```

You can override this by setting your own `"@snowpack/plugin-vue"` build script.

#### Plugin Options

None (but we should add support to pass options to the compiler).
