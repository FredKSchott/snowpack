# @snowpack/plugin-svelte

Use the [Svelte compiler](https://svelte.dev/docs#Compile_time) to build your `.svelte` files from source.

```
npm install --save-dev @snowpack/plugin-svelte
```

```js
// snowpack.config.json
{
  "plugins": [["@snowpack/plugin-svelte", { /* see "Plugin Options" below */}]]
}
```

#### Default Build Script

```js
{
  // Matches all ".svelte" files
  "scripts": {"build:svelte": "@snowpack/plugin-svelte"}
}
```

You can override this by setting your own `"@snowpack/plugin-svelte"` build script.

#### Plugin Options

All plugin `options` are passed directly to the Svelte compiler. See [here](https://svelte.dev/docs#svelte_compile) for a list of supported options.
