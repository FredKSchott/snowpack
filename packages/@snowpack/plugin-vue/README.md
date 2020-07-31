# @snowpack/plugin-vue

Use the [Vue 3 compiler](https://www.npmjs.com/package/@vue/compiler-sfc) to build your `.vue` SFC files from source.

```
npm install --save-dev @snowpack/plugin-vue
```

```js
// snowpack.config.json
{
  "plugins": [
    ["@snowpack/plugin-vue", {/* see “Plugin Options” below */}]
  ]
}
```

#### Plugin Options

| Name         |   Type    | Description                                                       |
| :----------- | :-------: | :---------------------------------------------------------------- |
| `sourceMaps` | `boolean` | Set to `false` to disable source map generation (default: `true`) |
