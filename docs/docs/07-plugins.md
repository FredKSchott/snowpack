## Snowpack Plugins

Snowpack is more than just a dev server, it's a platform to power your entire build pipeline. Babel, TypeScript, PostCSS, and any favorite build tool can be connected directly into Snowpack via 1-line plugins. 

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
{
  "plugins": ["@snowpack/plugin-babel"]
}
```

This is all you need to connect the plugin. If the plugin supports it, you can also pass options to the plugin to configure it's behavior:

```js
// snowpack.config.json
{
  "plugins": [
    ["@snowpack/plugin-babel", { /* ... */}]
  ],
}
```

#### Official Plugins
- [@snowpack/plugin-babel](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-babel)
- [@snowpack/plugin-svelte](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-svelte)
- [@snowpack/plugin-vue](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-vue)
- [@snowpack/plugin-dotenv](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-dotenv)
- [@snowpack/plugin-parcel](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-parcel)
- [@snowpack/plugin-react-refresh](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-react-refresh)
- [@snowpack/plugin-webpack](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-webpack)

#### Featured Community Plugins

- [@prefresh/snowpack](https://github.com/JoviDeCroock/prefresh)
- [snowpack-plugin-import-map](https://github.com/zhoukekestar/snowpack-plugin-import-map)

Don’t see your plugin in this list? [Add yours](https://github.com/pikapkg/snowpack/pulls)!
