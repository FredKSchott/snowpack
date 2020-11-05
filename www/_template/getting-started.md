---
layout: layouts/main.njk
title: Get Started
---

This guide will show you how to set up Snowpack from scratch in a Node.js project.

> 💡 Tip: For specific frameworks like React and Svelte we have framework guides. Check out our full list of guides here (TODO: INsert link).

In this guide you'll learn

- Unbundled development: **Unbundled development** is the idea of shipping individual files to the browser during development. Files can still be built with your favorite tools (like Babel, TypeScript, Sass) and then loaded individually in the browser with dependencies thanks to ESM `import` and `export` syntax. Any time you change a file, Snowpack only ever needs to rebuild that single file.
- Using ESM: Snowpack leverages JavaScript's native module system (<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import">known as ESM</a>) to create a first-of-its-kind build system that never builds the same file twice. Snowpack pushes changes instantly to the browser, saving you hours of development time traditionally spent waiting around for your bundler.
- Snowpack's dev server: Snowpack's dev server is an instant dev environment for [unbundled development.](#unbundled-development)
- Snowpack's build pipeline: Snowpack treats bundling as an optional production optimization, which means you're free to skip over the extra complexity of bundling until you need it.

- Using CSS: CSS is one of several built-in types of files that Snowpack can handle
- Using Node modules with ESM

> 💡 Tip: the project we'll create here is [Create Snowpack App minimalist template](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/). For a list of other templates available check out the [create-snowpack-app](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/cli) docs.

Prerequisites: Snowpack is a command line tool installed from npm. This guide assumes a basic understanding of Node.js, npm, and how to run commands in the terminal.

Snowpack builds your site for both modern and legacy browsers, but during development you'll need to use a [modern browser](http://caniuse.com/#feat=es6-module). Any recent release of Firefox, Chrome, or Edge will do. This is required to support the modern, bundle-free ESM imports that load your application in the browser.

## Install Snowpack

Let's create an empty directory. You can use any tool of your choice or the command line as shown here:

```bash
mkdir my-first-snowpack
cd my-first-snowpack
```

Now let's enable it as a Node project

```bash
npm init
```

> 💡 Tip: add the "--use-yarn" or "--use-pnpm" flag to use something other than npm

This creates our `package.json`, now let's install Snowpack

```
npm install --save-dev snowpack
```

> 💡 Tip: Snowpack can also be installed globally via `npm install -g snowpack`. But, we recommend installing locally in every project via `--save-dev`/`--dev`. You can run the Snowpack CLI locally via package.json "scripts", npm's `npx snowpack`, or via `yarn snowpack`.

## Snowpack Dev Server

`snowpack dev` - Snowpack's dev server is an instant dev environment for [unbundled development.](#unbundled-development) The dev server will only build a file when it's requested by the browser. That means that Snowpack can start up instantly (usually in **<50ms**) and scale to infinitely large projects without slowing down. In contrast, it's common to see 30+ second dev startup times when building large apps with a traditional bundler.

Snowpack supports JSX & TypeScript source code by default. You can extend your build even further with [custom plugins](/plugins) that connect Snowpack with your favorite build tools: TypeScript, Babel, Vue, Svelte, PostCSS, Sass... go wild!

To show you how it works let's create an `index.html` in your `my-first-snowpack` with the following contents:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Starter Snowpack App" />
    <title>Starter Snowpack App</title>
  </head>
  <body>
    <h1>Welcome to Snowpack!</h1>
  </body>
</html>
```

Now let's add the Snowpack dev server to `package.json` under as the `start` script:

```diff
  "scripts": {
+   "start": "snowpack dev",
    "test": "echo \"Error: no test specified\" && exit 1"

  },

```

Now you can run this on the command line to start the dev server

```
npm run start
```

Snowpack displays the local host address and automatically opens the page in your default browser.

TODO: add image showing the console and the site

Some key features:

- try changing the index.html and saving while the server is running, the site should refresh and show changes automatically

## ES Modules

Snowpack was designed to support JavaScript's native ES Module (ESM) syntax. ESM lets you define explicit imports & exports that browsers and build tools can better understand and optimize for. If you're familiar with the `import` and `export` keywords in JavaScript, then you already know ESM!

All modern browsers support ESM, so Snowpack is able to ship this code directly to the browser during development. This is what makes Snowpack's **unbundled development** workflow possible.

Let's create an example `hello-world.js` that creates a helloWorld ES module:

```js
export function helloWorld() {
  console.log('Hello World!');
}
```

And let's use our new module by importing it using ESM syntax. Create an `index.js` that imports our new module:

```js
import { helloWorld } from './hello-world.js';

helloWorld();
```

Now let's finally add to our `index.html` at the bottom of the body tag

```diff
  <body>
    <h1>Welcome to Snowpack!</h1>
+   <script type="module" src="/index.js"></script>
  </body>
```

Try making a change to the module. Snowpack will rebuild that module, but nothing else. With Snowpack **Every file is built individually and cached indefinitely.** Your dev environment will never build a file more than once and your browser will never download a file twice (until it changes). This is the real power of unbundled development.

> 💡 Tip: Snowpack detects the files in `index.html` for processing

Check your console and you should see the Hello World

## Using NPM Packages

NPM packages are mainly published using a module syntax (Common.js, or CJS) that can't run on the web without some build processing. Even if you write your application using browser-native ESM `import` and `export` statements that would all run directly in the browser, trying to import any one npm package will force you back into bundled development.

**Snowpack takes a different approach:** Instead of bundling your entire application for this one requirement, Snowpack processes your dependencies separately. Here's how it works:

```
node_modules/react/**/*     -> http://localhost:3000/web_modules/react.js
node_modules/react-dom/**/* -> http://localhost:3000/web_modules/react-dom.js
```

1. Snowpack scans your website/application for all used npm packages.
2. Snowpack reads these installed dependencies from your `node_modules` directory.
3. Snowpack bundles all of your dependencies separately into single JavaScript files. For example: `react` and `react-dom` are converted to `react.js` and `react-dom.js`, respectively.
4. Each resulting file can be run directly in the browser, and imported via ESM `import` statements.
5. Because your dependencies rarely change, Snowpack rarely needs to rebuild them.

After Snowpack builds your dependencies, any package can be imported and run directly in the browser with zero additional bundling or tooling required. This ability to import npm packages natively in the browser (without a bundler) is the foundation that all unbundled development and the rest of Snowpack is built on top of.

Snowpack lets you import npm packages directly in the browser. Even if a package was published using a legacy format, Snowpack will up-convert the package to ESM before serving it to the browser.

Let's install a package and use it

```bash
npm install --save canvas-confetti
```

Now head to `index.html` and add this

```diff

  <script type="module">
  import confetti from 'canvas-confetti';
confetti.create(document.getElementById('canvas'), {
  resize: true,
  useWorker: true,
})({ particleCount: 200, spread: 200 });

  </script>

```

Restart your Snowpack dev server and you should see this:
TODO: IMAGE/GIF

> 💡 Tip: When you start up your dev server or run a new build, you may see a message that Snowpack is "installing dependencies". This means that Snowpack is converting your dependencies to run in the browser.

> 💡 Tip: Sometimes node modules need to be polyfilled because TODO add links info/

## Adding CSS

First add this css file as `index.css`

```css
body {
  font-family: sans-serif;
}
```

Now let's include in our project by adding it to index.html in the `<head>`

```diff
    <meta name="description" content="Starter Snowpack App" />
+   <link rel="stylesheet" type="text/css" href="/index.css" />
    <title>Starter Snowpack App</title>
```

## Build for production/deployment

**You should be able to use a bundler because you want to, and not because you need to.** That was the original concept that Snowpack was designed to address. Snowpack treats bundling as an optional production optimization, which means you're free to skip over the extra complexity of bundling until you need it.

By default, `snowpack build` will build your site using the same unbundled approach as the `dev` command.

See ["Optimized Builds"](/#optimized-builds) for more information about connecting bundled (or unbundled) optimization plugins for your production builds.

When you're ready to deploy your application, run the `snowpack build` command to generate a static production build of your site. Building is tightly integrated with your dev setup so that you are guaranteed to get a near-exact copy of the same code that you saw during development.

Let's add this to package.json

```diff
  "scripts": {
    "start": "snowpack dev",
+   "build": "snowpack build",
    "test": "echo \"Error: no test specified\" && exit 1"

  },

```

Now let's try it out. Run this in your terminal

```bash
npm run build
```

You should see a new directory called `build` that contains a copy of your Snowpack project ready for deployment.

TODO: Image

## Bundle for deployment

`snowpack build` is fine for many projects, but you also may still want to bundle for production. Legacy browser support, code minification, code-splitting, tree-shaking, dead code elimination, and other performance optimizations can all be handled in Snowpack via bundling.

Bundlers normally require dozens or even hundreds of lines of configuration, but with Snowpack it's just a one-line plugin with no config required. This is possible because Snowpack builds your application _before_ sending it to the bundler, so the bundler never sees your custom source code (JSX, TS, Svelte, Vue, etc.) and instead only needs to worry about building common HTML, CSS, and JS.

Let's use the Webpack plugin. First install it

```bash
npm install @snowpack/plugin-webpack --save-dev
```

To tell snowpack to use it, we'll need to create a configuration file. Create a file named `snowpack.config.js`

```js
// Bundlers plugins are pre-configured to work with Snowpack apps.
// No config required!

module.exports = {
  plugins: ['@snowpack/plugin-webpack'],
};
```

## Next Steps

Congrads etc.!

Check out all the other stuff you can try built into Snowpack (CSS modules, JSX etc.)

Check out examples

Check out plugins

Check out our guides!
