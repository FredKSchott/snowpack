## Plugins

Snowpack isn't just a build tool for JavaScript, it is a build tool for your entire website. Babel, TypeScript, PostCSS, SVGR and any favorite build tool can be connected directly into Snowpack via 1-line plugins.

Snowpack plugins can be added to:
- Customize your build with new language/framework support (Svelte, Vue)
- Customize your build with new build tools (Babel, PostCSS)
- Run CLI commands during build and development (TypeScript, ESLint)
- Create custom transformations, specific to your exact application.

👉 **[Check out our advanced guide](/plugins) and learn how to create your own plugin.**


### Connect a Plugin

Connect a build plugin to Snowpack via the `"plugins"` array in your Snowpack config:

```js
// snowpack.config.json
// [npm install @snowpack/plugin-babel]
{
  "plugins": ["@snowpack/plugin-babel"]
}
```

This is all you need to add Babel to your application build pipeline. If the plugin supports it, you can also pass options to the plugin to configure its behavior:

```js
// snowpack.config.json
// [npm install @snowpack/plugin-babel]
{
  "plugins": [
    ["@snowpack/plugin-babel", { /* ... */}]
  ],
}
```

### Connect any Script/CLI

If you can't find a plugin that fits your needs and don't want to write your own, you can also run CLI commands directly as a part of your build using one of our two utility plugins: `@snowpack/plugin-build-script` & `@snowpack/plugin-run-script`.

#### @snowpack/plugin-build-script

```js
// snowpack.config.json
// [npm install @snowpack/plugin-build-script]
{
  "plugins": [
    ["@snowpack/plugin-build-script", { "cmd": "postcss", "input": [".css"], "output": [".css"]}]
  ],
}
```

This plugin allows you to connect any CLI into your build process. Just give it a `cmd` CLI command that can take input from `stdin` and emit the build result via `stdout`. Check out the README for more information.

#### @snowpack/plugin-run-script

```js
// snowpack.config.json
// [npm install @snowpack/plugin-build-script]
{
  "plugins": [
    ["@snowpack/plugin-run-script", { "cmd": "tsc --noEmit", "watch": "$1 --watch"}]
  ],
}
```

This plugin allows you to run any CLI command as a part of your dev and build workflow. This plugin doesn't affect your build output, but it is useful for connecting developer tooling directly into Snowpack. Use this to add meaningful feedback to your dev console as you type, like TypeScript type-checking and ESLint lint errors.


### Official Plugins
- [@snowpack/plugin-babel](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-babel)
- [@snowpack/plugin-svelte](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-svelte)
- [@snowpack/plugin-vue](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-vue)
- [@snowpack/plugin-dotenv](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-dotenv)
- [@snowpack/plugin-parcel](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-parcel)
- [@snowpack/plugin-react-refresh](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-react-refresh)
- [@snowpack/plugin-webpack](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-webpack)

👉 **[Check out our full list](/plugins) of official plugins.**

### Community Plugins

- [@prefresh/snowpack](https://github.com/JoviDeCroock/prefresh)
- [snowpack-plugin-import-map](https://github.com/zhoukekestar/snowpack-plugin-import-map)

Don’t see your plugin in this list? [Add yours](https://github.com/pikapkg/snowpack/pulls)!
