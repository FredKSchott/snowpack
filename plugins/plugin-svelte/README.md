# @snowpack/plugin-svelte

Use the [Svelte compiler](https://svelte.dev/docs#Compile_time) to build your `.svelte` files from source.

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

| Name              |                                  Type                                  | Description                                                                                                    |
| :---------------- | :--------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------- |
| `configFilePath`  |                                `string`                                | Relative path to a Svelte config file. Defaults to `./svelte.config.js` in the current project root directory. |
| `preprocess`      | [svelte.preprocess options](https://svelte.dev/docs#svelte_preprocess) | Configure the Svelte pre-processor.                                                                            |
| `compilerOptions` |    [svelte.compile options](https://svelte.dev/docs#svelte_compile)    | Configure the Svelte compiler. Using this option will skip                                                     |
| `hmrOptions`      |        [svelte-hmr options](https://github.com/rixo/svelte-hmr)        | Configure HMR & "fast refresh" behavior for Svelte. See defaults below.                                        |
