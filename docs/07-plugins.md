## Build Plugins

For more powerful integrations, Snowpack supports custom **build plugins**.  A build plugin is more than just a bash script: it's loaded via Node.js to customize and extend your Snowpack dev environment & build process. 

### Overview

A build plugin offers several different hooks into your application:

- `build()` - Automatically connects a build script to your build pipeline.
- `transform()` - Transform an already loaded resource before sending it to the browser.
- `bundle()` - Connect your favorite bundler for production.
- [Check out our advanced plugin guide for a full list of hooks.](/plugins)

### Connect a Plugin

Connect a build plugin to Snowpack via the `"plugins"` array in your Snowpack config;

```js
// snowpack.config.json
{
  "plugins": ["@snowpack/plugin-babel"]
}
```

This is all you need to connect the plugin into Snowpack. If a build script is provided, it will be automatically added to your "scripts" config. You can customize which files this script will match by defining the build script yourself. 

```js
// snowpack.config.json
{
  // Optional: Define your own build script for "@snowpack/plugin-babel".
  "scripts": {"build:js,jsx": "@snowpack/plugin-babel"},
  "plugins": ["@snowpack/plugin-babel"]
}
```


### Create Your Own Plugin

👉 **[Check out our advanced guide.](/plugins)**


### Plugin vs Script?

You can get pretty far with build scripts alone. If you just want to convert your source code to JavaScript/CSS and you have a CLI that can make that transformation for you, then a build script is probably fine. 

But, there are a few reasons you may want to use a build plugin instead of a normal build script:

**Speed:** Some CLIs may have a slower start-up time, which may become a problem as your site grows. Plugins can be faster across many files since they only need to be loaded & initialized once and not once for every file.

```js
"scripts": {
  // Speed: The Babel plugin is ~10x faster than using the Babel CLI directly
  "build:js,jsx": "@snowpack/plugin-babel",
}
```

**Lack of CLI:** Some frameworks, like Svelte, don't maintain dedicated CLIs. Snowpack Plugins allow you to tap into a tool's JS interface directly without building a whole new CLI interface.

```js
"scripts": {
  // Lack of CLI: There is no Svelte CLI. Our plugin taps directly into the Svelte compiler 
  "build:svelte": "@snowpack/plugin-svelte",
}
```

**Custom Control:** You can write your own project-specific plugins easily, and load them via relative path without ever needing to publish them.

```js
"scripts": {
  // Custom Behavior: Feel free to build your own!
  "build:vue": "./my-custom-vue-plugin.js",
}
```


## Advanced Usage

### Custom Plugin API

👉 **[Check out our advanced guide.](/plugins)**

### Custom HMR API

👉 **[Check out our advanced guide.](/plugins)**

### Programmatic API

👉 **[Check out our advanced guide.](/plugins)**
