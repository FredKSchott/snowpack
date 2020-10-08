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

## Plugin Options

This plugin also supports all Svelte compiler options. See [here](https://svelte.dev/docs#svelte_compile) for a list of supported options.

### HMR Options

You can pass Svelte HMR specific options through the `hot` option of the plugin. Here are the available options and their defaults:

```js
{
  "plugins": [
    ["@snowpack/plugin-svelte", {
      hot: {
        // don't preserve local state
        noPreserveState: false,
        // escape hatch from preserve local state -- if this string appears anywhere
        // in the component's code, then state won't be preserved for this update
        noPreserveStateKey: '@!hmr',
        // don't reload on fatal error
        noReload: false,
        // try to recover after runtime errors during component init
        optimistic: false,
      },
    }]
  ]
}
```
