# @snowpack/plugin-svelte

Use the [Svelte compiler](https://svelte.dev/docs#Compile_time) to build your `.svelte` files from source. Supports TypeScript and Sass out-of-the-box via [svelte-preprocess](https://github.com/sveltejs/svelte-preprocess).

```
npm install --save-dev @snowpack/plugin-svelte
```

```js
// snowpack.config.json
{
  "plugins": [
    ["@snowpack/plugin-svelte", { /* see optional “Plugin Options” below */ }]
  ]
}
```

## Plugin Options

By default, this plugin will look for a `svelte.config.js` file in your project directory to load `preprocess` and `compilerOptions` configuration from. However, you can also customize Svelte directly via the plugin options below.

| Name              |                                  Type                                  | Description                                                                                                                                                                                                                                                                                                                                                            |
| :---------------- | :--------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configFilePath`  |                                `string`                                | Relative path to a Svelte config file. Defaults to load `svelte.config.js` from the current project root directory.                                                                                                                                                                                                                                                    |
| `input`           |                               `string[]`                               | Array of file extensions to process. Uses `svelte.config.js` `extensions` if available. Defaults to `['.svelte']`.                                                                                                                                                                                                                                                     |
| `preprocess`      | [svelte.preprocess options](https://svelte.dev/docs#svelte_preprocess) | Configure the Svelte pre-processor. If this option is given, the config file `preprocess` option will be ignored. If any `preprocess` option is set to `false`, preprocessing will be skipped entirely regardless of file content. If no `preprocess` option is given, this plugin defaults to use [svelte-preprocess](https://github.com/sveltejs/svelte-preprocess). |
| `compilerOptions` |    [svelte.compile options](https://svelte.dev/docs#svelte_compile)    | Configure the Svelte compiler.If this option is given, the config file `preprocess` option will be ignored.                                                                                                                                                                                                                                                            |
| `hmrOptions`      |    [svelte-hmr options](https://github.com/rixo/svelte-hmr#options)    | Configure HMR & "fast refresh" behavior for Svelte.                                                                                                                                                                                                                                                                                                                    |
