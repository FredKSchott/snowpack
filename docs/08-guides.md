## Recipes

Below are a collection of guides for using different web frameworks and build tools with Snowpack. If you'd like to contribute a new recipe, feel free to edit the docs to add your own.

### Supported Libraries

All of the following frameworks have been tested and guaranteed to work in Snowpack without issues. If you encounter an issue using any of the following, please file an issue.

- React
- Preact
- JSX
- HTM
- lit-html
- Vue (see below)
- Svelte (see below)
- Tailwind CSS (see below)
- Sass (see below)
- and many more!
- Literally... every library should work with Snowpack!

Some libraries use compile-to-JS file formats and do require a special build script or plugin. See the guide below for examples.

### JSX

Snowpack has built-in support to handle `.jsx` & `.tsx` source files in your application.

**Note: Snowpack's default build does not support JSX in `.js`/`.ts` files.** If you can't use the `.jsx`/`.tsx` file extension, you can use [Babel](#babel) to build your application instead.

### TypeScript

Snowpack includes built-in support to build all TypeScript source files (`.ts` & `.tsx`) in your application.

For automatic TypeScript type checking during development, add the official [@snowpack/plugin-typescript](https://www.npmjs.com/package/@snowpack/plugin-typescript) plugin to your Snowpack config file. This plugin adds automatic `tsc` type checking results right in the Snowpack dev console.

```js
// snowpack.config.json
"plugins": ["@snowpack/plugin-typescript"]
```

### Babel

Snowpack already comes with built-in support for building JavaScript, TypeScript, and JSX. However, If you would like to run your build through Babel instead, you can replace our default file builder with the official Snowpack Babel plugin.

The plugin will automatically read plugins & presets from your local project `babel.config.*` config file, if one exists.

```js
// snowpack.config.json
"plugins": ["@snowpack/plugin-babel"],
```

### Preact

You can import and use Preact without any custom configuration needed.

**To use `preact/compat`:** (the Preact+React compatability layer) alias the "compat" package to React in your install options:

```js
// Example: Lets you import "react" in your application, but uses preact internally
// snowpack.config.json
"installOptions": {
  "alias": {
    "react": "preact/compat",
    "react-dom": "preact/compat"
  }
}
```

### Vue

```js
// snowpack.config.json
"plugins": ["@snowpack/plugin-vue"]
```

### Svelte

```js
// snowpack.config.json
"plugins": ["@snowpack/plugin-svelte"]
```

### PostCSS

```js
// snowpack.config.json
"plugins": [
  ["@snowpack/plugin-build-script", {"cmd": "postcss", "input": [".css"], "output": [".css"]}]
]
```

The [`postcss-cli`](https://github.com/postcss/postcss-cli) package must be installed manually. You can configure PostCSS with a `postcss.config.js` file in your current working directory.

### Tailwind CSS

You can add [Tailwind](https://tailwindcss.com) to any project via native CSS `@import`:

```css
/* index.css */
@import 'tailwindcss/dist/base.css';
@import 'tailwindcss/dist/components.css';
@import 'tailwindcss/dist/utilities.css';
```

#### Using Tailwind with PostCSS

If you are using PostCSS in your project ([see above](#postcss)) then you can just add Tailwind as a plugin to your `postcss.config.js`:

```js
// postcss.config.js
// Taken from: https://tailwindcss.com/docs/installation#using-tailwind-with-postcss
module.exports = {
  plugins: [
    // ...
    require('tailwindcss'),
    require('autoprefixer'),
    // ...
  ],
};
```

Once you have added the Tailwind PostCSS plugin, you can replace your native CSS `dist` imports with Tailwind's more powerful `base`, `components`, and `utilities` imports:

```diff
/* index.css */
- @import 'tailwindcss/dist/base.css';
- @import 'tailwindcss/dist/components.css';
- @import 'tailwindcss/dist/utilities.css';
+ @import 'tailwindcss/base';
+ @import 'tailwindcss/components';
+ @import 'tailwindcss/utilities';
```

Follow the official [Tailwind CSS Docs](https://tailwindcss.com/docs/installation/#using-tailwind-with-postcss) for more information.

### Sass

```js
// snowpack.config.json
"plugins": ["@snowpack/plugin-sass"]
```

[Sass](https://www.sass-lang.com/) is a stylesheet language that’s compiled to CSS. It allows you to use variables, nested rules, mixins, functions, and more, all with a fully CSS-compatible syntax. Sass helps keep large stylesheets well-organized and makes it easy to share design within and across projects.

To use Sass + PostCSS, check out [this guide](https://zellwk.com/blog/eleventy-snowpack-sass-postcss/).

### ESLint

```js
// snowpack.config.json
"plugins": [
  ["@snowpack/plugin-run-script", {
    "cmd": "eslint 'src/**/*.{js,jsx,ts,tsx}'",
    // Optional: Use npm package "watch" to run on every file change
    "watch": "watch \"$1\" src"
  }]
]
```

### Webpack

```js
// snowpack.config.json
{
  // Optimize your production builds with Webpack
  "plugins": [["@snowpack/plugin-webpack", {/* ... */}]]
}
```

Snowpack ships an official [webpack plugin](https://www.npmjs.com/package/@snowpack/plugin-webpack) for optimizing your build. Connect the `"@snowpack/plugin-webpack"` plugin into your Snowpack configuration file and then run `snowpack build` to see your optimized, bundled build.

See ["Optimized Builds"](/#optimized-builds) for more information about connecting bundled (or unbundled) optimization plugins for your production builds.

### Workbox

The [Workbox CLI](https://developers.google.com/web/tools/workbox/modules/workbox-cli) integrates well with Snowpack. Run the wizard to bootstrap your first configuration file, and then run `workbox generateSW` to generate your service worker.

Remember that Workbox expects to be run every time you deploy, as a part of a production build process. If you don't have one yet, create package.json [`"deploy"` and/or `"build"` scripts](https://michael-kuehnel.de/tooling/2018/03/22/helpers-and-tips-for-npm-run-scripts.html) to automate your production build process.


### @web/test-runner

[@web/test-runner](https://www.npmjs.com/package/@snowpack/app-scripts-react) is our recommended test runner for Snowpack projects. [See our section on testing](/#testing) for detailed instructions on how to get started with @web/test-runner.

### Jest

> Update (October 11, 2020): **We now recommend [@web/test-runner](https://www.npmjs.com/package/@snowpack/app-scripts-react) as our test runner of choice for Snowpack projects.** [See our section on testing](/#testing) for more background behind the change.

[Jest](https://jestjs.io/) is a popular Node.js test runner for Node.js & web projects. Jest can be used with any frontend project as long as you configure how Jest should build your frontend files to run on Node.js. Many projects will try to manage this configuration for you, since it can get complicated.

Snowpack ships pre-built Jest configuration files for several popular frameworks. If you need to use Jest for any reason,consider extending one of these packages:

- React: [@snowpack/app-scripts-react](https://www.npmjs.com/package/@snowpack/app-scripts-react)
- Preact: [@snowpack/app-scripts-preact](https://www.npmjs.com/package/@snowpack/app-scripts-preact)
- Svelte: [@snowpack/app-scripts-svelte](https://www.npmjs.com/package/@snowpack/app-scripts-svelte)

You can use these packages in your project like so:

```js
// jest.config.js
// Example: extending a pre-built Jest configuration file
module.exports = {
  ...require("@snowpack/app-scripts-preact/jest.config.js")(),
};
```


### Server Side Rendering (SSR)

To connect your own server to `snowpack dev` for SSR, there are a few things that you'll need to set up. Make sure that you include any Snowpack-built resources via script tags in your server's HTML response:

```html
<!-- Example: Create Snowpack App builds your src/ directory to the /_dist_/* directory -->
<script type="module" src="http://localhost:8080/_dist_/index.js"></script>
```

And make sure that your HTML response also includes code to configure HMR to talk to Snowpack's dev server:

```html
<!-- Configure Snowpack's HMR connection yourself, somewhere on your page HTML -->
<script>
  window.HMR_WEBSOCKET_URL = 'ws://localhost:8080';
</script>
```

### Leaving Snowpack

Snowpack is designed for zero lock-in. If you ever feel the need to add a traditional application bundler to your stack (for whatever reason!) you can do so in seconds.

Any application built with Snowpack should Just Work™️ when passed through Webpack/Rollup/Parcel. If you are already importing packages by name in your source code (ex: `import React from 'react'`) then you should be able to migrate to any popular bundler without issue.

If you are importing packages by full URL (ex: `import React from '/web_modules/react.js'`), then a simple Find & Replace should help you re-write them to the plain package name imports that most bundlers expect.
