---
layout: layouts/main.njk
title: Get Started
---

This guide will show you how to set up Snowpack from scratch. For specific frameworks like React and Svelte we have framework guides. Check out our full list of guides here.

In this guide you'll learn

- Snowpack's dev server
- Snowpack's build pipeline
- Using ESM!
- Using CSS
- Using node modules

> 💡 Tip: the project we'll create here is [Create Snowpack App minimalist template](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/). For a list of other templates available check out the [create-snowpack-app](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/cli) docs.

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

Snowpack supports JSX & TypeScript source code by default. You can extend your build even further with [custom plugins](#plugins) that connect Snowpack with your favorite build tools: TypeScript, Babel, Vue, Svelte, PostCSS, Sass... go wild!

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

When started it should show you the local host address and automatically open the page in your default browser.

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

> 💡 Tip: Snowpack detects the files in `index.html` for processing

Check your console and you should see the Hello World

## Using NPM Packages

Snowpack lets you import npm packages directly in the browser. Even if a package was published using a legacy format, Snowpack will up-convert the package to ESM before serving it to the browser.

When you start up your dev server or run a new build, you may see a message that Snowpack is "installing dependencies". This means that Snowpack is converting your dependencies to run in the browser.

Let's install a package and use it

```bash
npm install --save canvas-confetti
```

Now head to `index.js` and add this

```diff
import { helloWorld } from './hello-world.js';
+import confetti from 'canvas-confetti';

helloWorld();
+confetti.create(document.getElementById('canvas'), {
+  resize: true,
+  useWorker: true,
+})({ particleCount: 200, spread: 200 });

```

Restart your Snowpack dev server and you should see this:
TODO: IMAGE/GIF

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

When you're ready to deploy your application, run the `snowpack build` command to generate a static production build of your site. Building is tightly integrated with your dev setup so that you are guaranteed to get a near-exact copy of the same code that you saw during development.

Let's add this to package.json

Now let's try it out.

You should see a new directory called so and so with the things in it.

You may also want to use a bundler or optimize the code to do this check out our docs.

## Next Steps

Congrads etc.!

Check out all the other stuff you can try built into Snowpack (CSS modules, JSX etc.)

Check out our guides!
