---
layout: layouts/main.njk
title: 'Starting a New Project'
---

Welcome to Snowpack! This guide shows you how to set up Snowpack from scratch in a Node.js project. Along the way you'll learn key concepts of Snowpack and unbundled development

In this guide you'll learn

- What makes Snowpack so fast? (hint: unbundled development!)
- What are JavaScript ES Modules (ESM)?
- Creating your first project
- Starting Snowpack's dev server
- Building your first project
- Customizing Snowpack with plugins

> 💡 Tip: This guide will walk you through creating the [Snowpack minimal app template](https://github.com/snowpackjs/snowpack/tree/main/create-snowpack-app/ from scratch. You can see the final result [here](https://github.com/snowpackjs/snowpack/tree/main/create-snowpack-app/), along with more [examples](https://github.com/snowpackjs/snowpack/tree/main/create-snowpack-app/cli) to get you started

Prerequisites: Snowpack is a command line tool installed from npm. This guide assumes a basic understanding of JavaScript, npm, and how to run commands in the terminal.

Snowpack also requires a modern browser during development. Any semi-recent release of Firefox, Chrome, Safari or Edge will do.

## Install Snowpack

To get started, create an empty directory for your new Snowpack project. You can do this however you like, or by running the CLI command shown here:

```bash
mkdir my-first-snowpack
cd my-first-snowpack
```

Snowpack is a package installed from npm, so you'll need need a `package.json` file in your project directory to manage your dependencies. You can run this command in your project to create a simple, empty `package.json`:

```bash
npm init
```

> 💡 Tip: In a hurry? You can run `npm init --yes` to skip the prompts and generate a package.json with npm's default, recommended fields.

Now install Snowpack to your `dev dependencies` with this command:

```
npm install --save-dev snowpack
```

> 💡 Tip: Snowpack can also be installed globally via `npm install -g snowpack`. But, we recommend installing locally in every project via `--save-dev`/`--dev`. You can run the Snowpack CLI locally via package.json "scripts", npm's `npx snowpack`, or via `yarn snowpack`.

## Snowpack's development server

In this step we'll add some files so we can showcase Snowpack's development server, an instant development environment for unbundled development. The development server only builds a file when it's requested by the browser. That means that Snowpack can start up instantly (usually in **<50 ms**) and scale to infinitely large projects without slowing down. In contrast, it's common to see 30+ second dev startup times when building large apps with a traditional bundler.

First create an `index.html` in your project with the following contents:

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

Add the Snowpack development server to `package.json` under as the `start` script:

```diff
  "scripts": {
+   "start": "snowpack dev",
    "test": "echo \"Error: no test specified\" && exit 1"
  },

```

Run the following on the command line to start the Snowpack development server

```
npm run start
```

If all went well, Snowpack will automatically open your site in a new browser!

IMAGE: GIF. Side by side of the terminal showing the dev server output. The dev server output displays the localhost address the project is running on. In a browser window you can see the running project on localhost, which is "Welcome to Snowpack" on a white background. An edit is made to `index.html` adding an exclamation point, the browser window shows the updated text as soon as the file is saved.

Congrads! You now have a Snowpack project up and running! Try changing the index.html and saving while the server is running, the site should refresh and show changes automatically.

## Using JavaScript

Lets talk about JavaScript. JavaScript's native ES Module (ESM) syntax is the magic behind Snowpack's unbundled developmen. There's a good chance that you're already familiar with ESM, and you just don't know it! ESM lets you define explicit imports & exports that browsers and build tools can better understand and optimize for. If you're familiar with the `import` and `export` keywords in JavaScript, then you already know ESM!

To add some JavaScript functionality to your Snowpack site, create a new JavaScript file called `hello-world.js` that exports a single `helloWorld` function:

```js
// my-first-snowpack/hello-world.js
export function helloWorld() {
  console.log('Hello World!');
}
```

Then create an `index.js` that imports your new module using ESM syntax:

```js
// my-first-snowpack/index.js
import { helloWorld } from './hello-world.js';

helloWorld();
```

Snowpack scans for files referenced in `index.html`, so add your `index.js` to `index.html` at the bottom of the `<body>` tag:

```diff
  <body>
    <h1>Welcome to Snowpack!</h1>
+   <script type="module" src="/index.js"></script>
  </body>
```

Check your console on your Snowpack site. You should see "Hello World!" Try making a change to the module. Snowpack will rebuild that module without rebuilding the rest of your code. Snowpack builds **every file individually and caches it indefinitely.** Your development environment will never build a file more than once and your browser will never download a file twice (until it changes). This is the real power of unbundled development, and the secret behind what makes Snowpack so fast.

IMAGE: Gif showing the code next to the project running in the browser. On save the console shows "Hello World!". On edit and save of the `hello-world.js` file to be "Hello everyone!" instead, that instantly shows in the browser console.

## Using npm Packages

While writing your own JavaScript is great, you'll also probably want to use JavaScript from npm. npm packages are mainly published using a module syntax (Common.js, or CJS) that can't run on the web without some build processing. Even if you write your application using browser-native ESM `import` and `export` statements that would all run directly in the browser, trying to import any one npm package will force you back into bundled development.

**Snowpack takes a different approach:** instead of bundling your entire application for this one requirement, Snowpack processes your dependencies separately. Here's how it works:

```
node_modules/react/**/*     -> http://localhost:3000/web_modules/react.js
node_modules/react-dom/**/* -> http://localhost:3000/web_modules/react-dom.js
```

1. Snowpack scans your website/application for all used npm packages.
2. Snowpack reads these installed dependencies from your `node_modules` directory.
3. Snowpack bundles all of your dependencies separately into single JavaScript files. For example: `react` and `react-dom` convert to `react.js` and `react-dom.js`, respectively.
4. Each resulting file runs directly in the browser, and imported via ESM `import` statements.
5. Because your dependencies rarely change, Snowpack rarely needs to rebuild them.

After Snowpack builds your dependencies, any package can be imported and run directly in the browser with zero additional bundling or tooling required. This ability to import npm packages natively in the browser (without a bundler) is the foundation that all unbundled development and the rest of Snowpack builds on top of.

Snowpack lets you import npm packages directly in the browser. Even if a package is using a legacy format, Snowpack will up-convert the package to ESM before serving it to the browser.

> 💡 Tip: when you start up your development server or run a new build, you may see a message that Snowpack is "installing dependencies." This means that Snowpack is converting your dependencies to run in the browser.

Install the canavas-confetti package from npm and use it with the following command:

```bash
npm install --save canvas-confetti
```

Now head to `index.js` and add this code:

```diff
helloWorld();

+import confetti from 'canvas-confetti';
+confetti.create(document.getElementById('canvas'), {
+  resize: true,
+  useWorker: true,
+ })({ particleCount: 200, spread: 200 });
```

> 💡 Tip: Did you know, with Snowpack you can also add this code directly to your HTML if you prefer!

You should now see a nifty confetti effect on your site.

IMAGE: Gif showing site loading with a confetti effect

> 💡 Tip: not all NPM modules may work well in the browser. If it's dependent on Node.js built-in modules you'll need to polyfill Node. Read more about how to do this on our [features page.](/features)

## Adding CSS

Snowpack natively supports many file types. CSS and CSS Modules for example. Here you'll add a simple CSS file.

First add the following css as a new `index.css` file:

```css
body {
  font-family: sans-serif;
}
```

Include it in your project by adding it to index.html in the `<head>`

```diff
    <meta name="description" content="Starter Snowpack App" />
+   <link rel="stylesheet" type="text/css" href="/index.css" />
    <title>Starter Snowpack App</title>
```

Image: GIF showing adding the css to `index.html` and saving, showing the visual changes as the CSS loads.

## Build for production/deployment

OK you've now built the most amazing website ever (or something like that) and you want to launch it. It's time to use `Snowpack build`.

By default, `snowpack build` builds your site using the same unbundled approach as the `dev` command. Building is tightly integrated with your development setup so that you are guaranteed to get a near-exact copy of the same code that you saw during development.

Add the `snowpack build` comman to package.json so it's easier to run on the command line:

```diff
  "scripts": {
    "start": "snowpack dev",
+   "build": "snowpack build",
    "test": "echo \"Error: no test specified\" && exit 1"

  },

```

Now you can run this in your terminal:

```bash
npm run build
```

You should see a new directory called `build` that contains a copy of your Snowpack project ready for deployment.

IMAGE: GIF terminal running Snowpack build, showing output, then clicking on the new `build` directory

## Next Steps

You've just learned the major concepts of unbundled developments and built a tiny Snowpack project. But that's just the beginning with Snowpack.

What's next? Our docs site has several great resources

- [Bundling for production guide](/guides/bundling): how to connect a bundler like Webpack to optimize code for production deployments
- [Features](/features): a list of all the built in features Snowpack supports right out of the box
- [Plugins](/plugins): a list of plugins that allow you to integrate your favorite tools with Snowpack
- [Templates/Examples](https://github.com/snowpackjs/snowpack/tree/main/create-snowpack-app/cli): pre-built projects you can build on or just explore using many popular frameworks and tools
- [Guides](/guides): Step by step deep dives on building with and for Snowpack. Includes frameworks like React and Svelte.

If you have any questions, comments, or corrections, we'd love to hear from you in the Snowpack [discussion](https://github.com/snowpackjs/snowpack/discussions) forum or our [Snowpack Discord community](https://discord.gg/rS8SnRk).
