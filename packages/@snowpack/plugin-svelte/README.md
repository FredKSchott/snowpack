# @snowpack/plugin-svelte

Use the [Svelte compiler](https://svelte.dev/docs#Compile_time) to build your `.svelte` files from source.

```
npm install --save-dev @snowpack/plugin-svelte
```

```js
// snowpack.config.json
{
  "plugins": [
    ["@snowpack/plugin-svelte", { /* see “Plugin Options” below */ }]
  ]
}
```

#### Plugin Options

This plugin also supports all Svelte compiler options. See [here](https://svelte.dev/docs#svelte_compile) for a list of supported options.
