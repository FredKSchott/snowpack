## Recipes

Below are a collection of guides for using different web frameworks and build tools with Snowpack. If you'd like to contribute a new recipe, feel free to edit the docs to add your own.

### Supported Libraries

All of the following frameworks have been tested and guaranteed to work in Snowpack without issues. Some libraries (ex: Vue)compile to JS, and do require a build script (see the related guide below for a code snippet).  If you encounter an issue using any of the following, please file an issue.

- React
- Preact
- JSX
- HTM
- lit-html
- Vue (see below)
- Svelte (see below)
- Tailwind CSS (see below)
- [add more.](https://github.com/pikapkg/snowpack/edit/master/docs/08-guides.md)


### JSX (React, Preact, etc.)

To author code using JSX & `.jsx` files in your `src/` directory, [connect Babel](#babel) or any other JSX -> JS transpiler to your build.


### Vue


```js
// snowpack.config.json
"scripts": { 
  "plugin:vue": "vue"
}
```

**NOTE: Due to a bug, the "scripts" section must include at least one "build" script.** You can work around this issue by using a dummy build script, like this:

```js
"scripts": {
  "build:dummy": "cat",
  "plugin:vue": "vue"
}

```

### Svelte

```js
// snowpack.config.json
"scripts": { 
  "plugin:svelte": "svelte"
}
```

**NOTE: Due to a bug, the "scripts" section must include at least one "build" script.** You can work around this issue by using a dummy build script, like this:

```js
"scripts": {
  "build:dummy": "cat",
  "plugin:svelte": "svelte"
}

```

### Babel

Babel will automatically read plugins & presets from your local project `babel.config.*` config file, if one exists.

#### via plugin (Recommended)

```js
"scripts": { 
  "plugin:js,jsx": "babel"
}
```

**NOTE: Due to a bug, the "scripts" section must include at least one "build" script.** You can work around this issue by using a dummy build script, like this:

```js
"scripts": {
  "build:dummy": "cat",
  "plugin:js,jsx": "babel"
}

```

#### via @babel/cli

```js
"scripts": {
  // NOTE: Not recommended, slower on large sites than the plugin.
  "build:js,jsx": "babel --no-babelrc"
}
```


### TypeScript

Note: If you're having trouble importing type declarations with your packages, see our section above on TypeScript Support.

TypeScript will automatically read config from your local project `tsconfig.json` file. If you need to pass additional flags, you can do so via the command.

```js
"scripts": { 
  "lintall:ts,tsx": "tsc --noEmit",
  "lintall:ts,tsx::watch": "$1 --watch"
}
```

**NOTE: Due to a bug, the "scripts" section must include at least one "build" script.** You can work around this issue by using a dummy build script, like this:

```js
"scripts": {
  "build:dummy": "cat",
}

```

Note that while TypeScript is a great type checker, we recommend using Babel to build TypeScript files to JavaScript. Babel supports much greater control over your build output.

```js
"scripts": { 
  "plugin:ts,tsx": "babel",
  "lintall:ts,tsx": "tsc --noEmit",
  "lintall:ts,tsx::watch": "$1 --watch"
}
```

### PostCSS

```js
// snowpack.config.json
"scripts": { 
  "build:css": "postcss"
}
```

### Tailwind CSS

Tailwind ships with first-class support for PostCSS. Copy the [PostCSS](#postcss) script above, and then grab the recommended PostCSS plugin from the official [Tailwind CSS Docs](https://tailwindcss.com/docs/installation/#using-tailwind-with-postcss).

### SASS

Make sure that you have Sass installed, and then add a "build:scss" script to convert your Sass files to CSS.

```js
// snowpack.config.json
"scripts": { 
  "build:scss": "sass"
}
```

### Workbox

The [Workbox CLI](https://developers.google.com/web/tools/workbox/modules/workbox-cli) integrates well with Snowpack. Run the wizard to bootstrap your first configuration file, and then run `workbox generateSW` to generate your service worker.

Remember that Workbox expects to be run every time you deploy, as a part of a production "build" process (similar to how Snowpack's [`--optimize`](#production-optimization) flag works). If you don't have one yet, create package.json [`"deploy"` and/or `"build"` scripts](https://michael-kuehnel.de/tooling/2018/03/22/helpers-and-tips-for-npm-run-scripts.html) to automate your production build process.


### Leaving Snowpack

Snowpack is designed for zero lock-in. If you ever feel the need to add a traditional application bundler to your stack (for whatever reason!) you can do so in seconds.

Any application built with Snowpack should Just Work™️ when passed through Webpack/Rollup/Parcel. If you are already importing packages by name in your source code (ex: `import React from 'react'`) then you should be able to migrate to any popular bundler without issue. 

If you are importing packages by full URL (ex: `import React from '/web_modules/react.js'`), then a simple Find & Replace should help you re-write them to the plain package name imports that most bundlers expect.

