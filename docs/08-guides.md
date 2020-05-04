## Recipes

Below are a collection of guides for using different web frameworks and build tools with Snowpack. If you'd like to contribute a new recipe, feel free to edit the docs to add your own.

### Babel

Babel will automatically read plugins & presets from your local project `babel.config.*` config file, if one exists.

#### via plugin (Recommended)

```js
"scripts": { 
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

Note that while TypeScript is a great type checker, we recommend using Babel to build TypeScript files to JavaScript. Babel supports much greater control over your build output.

```js
"scripts": { 
  "plugin:ts,tsx": "babel",
  "lintall:ts,tsx": "tsc --noEmit",
  "lintall:ts,tsx::watch": "$1 --watch"
}
```


### Vue


```js
// snowpack.config.json
"scripts": { 
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

### React & Preact

JSX is handled by Snowpack by default. If you want to define your own build script for JS, you'll need to handle the JSX transformation by yourself (usually via Babel). Or you can use HTM, a JSX alternative that runs natively in the browser, no babel required.


### lit-html

[lit-html](https://lit-html.polymer-project.org/) is "an efficient, expressive, extensible HTML templating library for JavaScript." Similarly to [HTM](#htm), lit-html uses tagged template literals for JSX-like syntax in the browser without requiring any transpilation.


**Important:** [lit-html directives](https://lit-html.polymer-project.org/guide/template-reference#built-in-directives) aren't exported by the main package. If you use these directives in your project, you'll need to have `lit-html` installed as a regular "dependencies" package (outside of your "webDependencies").

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

