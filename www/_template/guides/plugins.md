---
layout: layouts/guide.njk
permalink: '/guides/plugins/'
title: Snowpack Plugin Guide
description: 'Documentation and guides for building Snowpack plugins.'
date: 2020-07-30
tags: guides
sidebarTitle: Plugins
---

#### Who is this page for?

- Anyone writing a custom plugin for Snowpack.
- Anyone extending Snowpack to support new file types.
- Anyone extending Snowpack with a custom bundler or production optimization.
- Anyone adding Fast Refresh or automatic HMR for a framework.

Looking for help using Snowpack in your project?
👉 **[Check out our main docs.](/)**

## Plugin Overview

A **Snowpack Plugin** is an object interface that lets you customize Snowpack's behavior. Snowpack provides different hooks for your plugin to connect to. For example, you can add a plugin to handle Svelte files, optimize CSS, convert SVGs to React components, run TypeScript during development, and much more.

Snowpack's plugin interface is inspired by Rollup. If you've ever written a Rollup plugin before, then hopefully these concepts and terms feel familiar.

### Build Plugins

Snowpack uses an internal **Build Pipeline** to build files in your application for development and production. Every source file passes through the build pipeline, which means that Snowpack can build more than just JavaScript. Images, CSS, SVGs and more can all be built by Snowpack.

Snowpack runs each file through the build pipeline in two separate steps:

1. **Load:** Snowpack finds the first plugin that claims to `resolve` the given file. It then calls that plugin's `load()` method to load the file into your application. This is where compiled languages (TypeScript, Sass, JSX, etc.) are loaded and compiled to something that can run on the web (JS, CSS, etc).
2. **Transform:** Once loaded, every file passes through the build pipeline again to run through matching `transform()` methods of all plugins that offer the method. Plugins can transform a file to modify or augment its contents before finishing the file build.

### Dev Tooling Plugins

Snowpack plugins support a `run()` method which lets you run any CLI tool and connect its output into Snowpack. You can use this to run your favorite dev tools (linters, TypeScript, etc.) with Snowpack and automatically report their output back through the Snowpack developer console. If the command fails, you can optionally fail your production build.

### Bundler Plugins

Snowpack builds you a runnable, unbundled website by default, but you can optimize this final build with your favorite bundler (webpack, Rollup, Parcel, etc.) through the plugin `optimize()` method. When a bundler plugin is used, Snowpack will run the bundler on your build automatically to optimize it.

See our official [@snowpack/plugin-webpack](https://github.com/snowpackjs/snowpack/tree/master/plugins/plugin-webpack) bundler plugin for an example of using the current interface.

## How to Write a Plugin

### Getting Started

To create a Snowpack plugin, you can start with the following file template:

```js
// my-snowpack-plugin.js
module.exports = function (snowpackConfig, pluginOptions) {
  return {
    name: 'my-snowpack-plugin',
    // ...
  };
};
```

```json
// snowpack.config.json
{
  "plugins": [
    ["./my-snowpack-plugin.js", { "optionA": "foo", "optionB": "bar" }]
  ]
}
```

A Snowpack plugin should be distributed as a function that can be called with plugin-specific options to return a plugin object.
Snowpack will automatically call this function to load your plugin. That function accepts 2 parameters, in this order:

1. the [Snowpack configuration object](/#all-config-options) (`snowpackConfig`)
1. (optional) user-provided config options (`pluginOptions`)

### Develop and Test

To develop and test a Snowpack plugin, the strategy is the same as with other npm packages:

<ol>
  <li>Create your new plugin project (either with <code>npm init</code> or <code>yarn init</code>) with, for example, npm name: <code>my-snowpack-plugin</code> and paste in it the above-mentioned code snipped</li>
  <li>Run <code>npm link</code> in your plugin’s project folder to expose the plugin globally (in regard to your development machine).</li>
  <li>Create a new, example Snowpack project in a different location for testing</li>
  <li>
    In your example Snowpack project, run <code>npm install && npm link my-snowpack-plugin</code> (use the name from your plugin’s <code>package.json</code>).
    <ul>
      <li>Be aware that <code>npm install</code> will remove your linked plugin, so on any install, you will need to redo the <code>npm link my-snowpack-plugin</code>. </li>
      <li>(The alternative would be to use <code>npm install --save-dev &lt;folder_to_your_plugin_project&gt;</code>, which would create the "symlink-like" entry in your example Snowpack project’s <code>package.json</code>)</li>
    </ul>
  </li>
  <li>In your example Snowpack project, add your plugin to the <code>snowpack.config.json</code> along with any plugin options you’d like to test:
    <pre>
      <code class="json">
{
  "plugins": [
    ["my-snowpack-plugin", { "option-1": "testing", "another-option": false }]
  "
}
      </code>
    </pre>
  </li>
</ol>

### Transform a File

For our first example, we’ll look at transforming a file.

```js
module.exports = function (snowpackConfig, pluginOptions) {
  return {
    name: 'my-commenter-plugin',
    async transform({ id, contents, isDev, fileExt }) {
      if (fileExt === '.js') {
        return `/* I’m a comment! */ ${contents}`;
      }
    },
  };
};
```

The object returned by this function is a **Snowpack Plugin**. A plugin consists of a `name` property and some hooks into the Snowpack lifecycle to customizes your build pipeline or dev environment. In the example above we have:

- The **name** property: The name of your plugin. This is usually the same as your package name if published to npm.
- The **transform** method: A function that allows you to transform & modify built files. In this case, we add a simple comment (`/* I’m a comment */`) to the beginning of every JS file in your build.

This covers the basics of single-file transformations. In our next example, we’ll show how to compile a source file and change the file extension in the process.

### Build From Source

When you build files from source, you also have the ability to transform the file type from source code to web code. In this example, we'll use Babel to load several types of files as input and output JavaScript in the final build:

```js
const babel = require('@babel/core');

module.exports = function (snowpackConfig, pluginOptions) {
  return {
    name: 'my-babel-plugin',
    resolve: {
      input: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
      output: ['.js'],
    },
    async load({ filePath }) {
      const result = await babel.transformFileAsync(filePath);
      return result.code;
    },
  };
};
```

This is a simplified version of the official Snowpack Babel plugin, which builds all JavaScript, TypeScript, and JSX files in your application with the `load()` method.

The `load()` method is responsible for loading and build files from disk while the `resolve` property tells Snowpack which files the plugin can load and what to expect as output. In this case, the plugin claims responsibility for files matching any of the file extensions found in `resolve.input`, and outputs `.js` JavaScript (declared via `resolve.output`).

**See it in action:** Let's say that we have a source file at `src/components/App.jsx`. Because the `.jsx` file extension matches an extension in our plugin's `resolve.input` array, Snowpack lets this plugin claim responsibility for loading this file. `load()` executes, Babel builds the JSX input file from disk, and JavaScript is returned to the final build.

### Multi-File Building

For a more complicated example, we’ll take one input file (`.svelte`) and use it to generate 2 output files (`.js` and `.css`).

```js
const fs = require("fs").promises;
const svelte = require("svelte/compiler");

module.exports = function(snowpackConfig, pluginOptions) {
  return {
    name: 'my-svelte-plugin',
    resolve: {
      input: ['.svelte'],
      output: ['.js', '.css'],
    }
    async load({ filePath }) {
      const fileContents = await fs.readFile(filePath, 'utf-8');
      const { js, css } = svelte.compile(codeToCompile, { filename: filePath });
      return {
        '.js': js && js.code,
        '.css': css && css.code,
      };
    }
  };
};
```

This is a simplified version of the official Snowpack Svelte plugin. Don't worry if you're not familiar with Svelte, just know that building a Svelte file (`.svelte`) generates both JS & CSS for our final build.

In that case, the `resolve` property only takes a single `input` file type (`['.svelte']`) but two `output` file types (`['.js', '.css']`). This matches the result of Svelte's build process and the returned entries of our `load()` method.

**See it in action:** Let's say that we have a source file at `src/components/App.svelte`. Because the `.svelte` file extension matches an extension in our plugin's `resolve.input` array, Snowpack lets this plugin claim responsibility for loading this file. `load()` executes, Svelte builds the file from disk, and both JavaScript & CSS are returned to the final build.

Notice that `.svelte` is missing from `resolve.output` and isn't returned by `load()`. Only the files returned by the `load()` method are included in the final build. If you wanted your plugin to keep the original source file in your final build, you could add `{ '.svelte': contents }` to the return object.

### Server-Side Rendering (SSR)

Plugins can produce server-optimized code for SSR via the `load()` plugin hook. The `isSSR` flag tells the plugin that Snowpack is requesting your file for the server, and that it will expect a response that will run on the server.

Some frameworks/languages (like React) run the same code on both the browser and the server. Others (like Svelte) will create different output for the server than the browser. In the example below, we use the `isSSR` flag to tell the Svelte compiler to generate server-optimized code when requested by Snowpack.

```js
const svelte = require('svelte/compiler');
const fs = require('fs');

module.exports = function (snowpackConfig, pluginOptions) {
  return {
    name: 'basic-svelte-plugin',
    resolve: {
      input: ['.svelte'],
      output: ['.js', '.css'],
    },
    async load({ filePath, isSSR }) {
      const svelteOptions = {
        /* ... */
      };
      const codeToCompile = fs.readFileSync(filePath, 'utf-8');
      const result = svelte.compile(codeToCompile, {
        ...svelteOptions,
        ssr: isSSR,
      });
      // ...
    },
  };
};
```

If you're not sure if your plugin needs special SSR support, you are probably fine to skip this and ignore the `isSSR` flag in your plugin. Many languages won't need this, and SSR is always an intentional opt-in by the user.

### Optimizing & Bundling

Snowpack supports pluggable bundlers and other build optimizations via the `optimize()` hook. This method runs after the build and gives plugins a chance to optimize the final build directory. Webpack, Rollup, and other build-only optimizations should use this hook.

```js
module.exports = function(snowpackConfig, pluginOptions) {
  return {
    name: 'my-custom-webpack-plugin',
    async optimize({ buildDirectory }) {
      await webpack.run({...});
    }
  };
};
```

This is an (obviously) simplified version of the `@snowpack/plugin-webpack` plugin. When the build command has finished building your application, this plugin hook is called with the `buildDirectory` path as an argument. It's up to the plugin to read build files from this directory and write any changes back to the directory. Changes should be made in place, so only write files at the end and be sure to clean up after yourself (if a file is no longer needed after optimizing/bundling, it is safe to remove).

### Tips / Gotchas

- Remember: A source file will always be loaded by the first `load()` plugin to claim it, but the build result will be run through every `transform` function.
- Snowpack will always keep the original file name (`App`) and only ever change the extension in the build.
- Extensions in Snowpack always have a leading `.` character (e.g. `.js`, `.ts`). This is to match Node’s `path.extname()` behavior, as well as make sure we’re not matching extension substrings (e.g. if we matched `js` at the end of a file, we also don’t want to match `.mjs` files by accident; we want to be explicit there).
- The `resolve.input` and `resolve.output` file extension arrays are vital to how Snowpack understands your build pipeline, and are always required for `load()` to run correctly.
- If `load()` doesn't return anything, the file isn’t loaded and the `load()` of the next suitable plugin is called.
- If `transform()` doesn't return anything, the file isn’t transformed.
- If you want to build a plugin that only runs some code on initialization (such as `@snowpack/plugin-dotenv`), put your side-effect code inside the function that returns your plugin. But be sure to still return a plugin object. A simple `{ name }` object will do.

## Plugin API

Check out our ["SnowpackPlugin" TypeScript definition](https://github.com/snowpackjs/snowpack/tree/master/snowpack/src/types/snowpack.ts) for a fully documented and up-to-date summary of the Plugin API and all supported options.

### knownEntrypoints

```
// Example: Svelte plugin needs to make sure this dependency can be loaded.
knownEntrypoints: ["svelte/internal"]
```

An list of any npm dependencies that are added as a part of `load()` or `transform()` that Snowpack will need to know about. Snowpack analyzes most dependency imports automatically when it scans the source code of a project, but some imports are added as a part of a `load()` or `transform()` step, which means that Snowpack would never see them. If your plugin does this, add them here.

### config()

```js
config(snowpackConfig) {
  // modify or read from the Snowpack configuration object
}
```

Use this hook to read or make changes to the completed Snowpack configuration object. This is currently the recommended way to access the Snowpack configuration, since the one passed to the top-level plugin function is not yet finalized and may be incomplete.

- [Full TypeScript definition](https://github.com/snowpackjs/snowpack/tree/master/snowpack/src/types/snowpack.ts).

### resolve

```
// Example: Sass plugin compiles Sass files to CSS.
resolve: {input: [".sass"], output: [".css"]}

// Example: Svelte plugin compiles Svelte files to JS & CSS.
resolve: {input: [".svelte"], output: [".js",[".css"]}
```

If your plugin defines a `load()` method, Snowpack will need to know what files your plugin is responsible to load and what its output will look like. **`resolve` is only needed if you also define a `load()` method.**

- `input`: An array of file extensions that this plugin will load.
- `output`: The set of all file extensions that this plugin's `load()` method will output.
- [Full TypeScript definition](https://github.com/snowpackjs/snowpack/tree/master/snowpack/src/types/snowpack.ts).

### load()

Load a file from disk and build it for your application. This is most useful for taking a file type that can't run in the browser (TypeScript, Sass, Vue, Svelte) and returning JS and/or CSS. It can even be used to load JS/CSS files directly from disk with a build step like Babel or PostCSS.

- See above for an example of how to use this method.
- [Full TypeScript definition](https://github.com/snowpackjs/snowpack/tree/master/snowpack/src/types/snowpack.ts).

### transform()

Transform a file's contents. Useful for making changes to all types of output (JS, CSS, etc.) regardless of how they were loaded from disk.

- See above for an example of how to use this method.
- Example: [@snowpack/plugin-postcss](https://github.com/snowpackjs/snowpack/tree/master/plugins/plugin-postcss)
- [Full TypeScript definition](https://github.com/snowpackjs/snowpack/tree/master/snowpack/src/types/snowpack.ts).

### run()

Run a CLI command, and connect it's output into the Snowpack console. Useful for connecting tools like TypeScript.

- [Full TypeScript definition](https://github.com/snowpackjs/snowpack/tree/master/snowpack/src/types/snowpack.ts).

### optimize()

Snowpack’s bundler plugin API is still experimental and may change in a future release. See our official bundler plugins for an example of using the current interface:

- Example: [@snowpack/plugin-webpack](https://github.com/snowpackjs/snowpack/tree/master/plugins/plugin-webpack)
- Example: [snowpack-plugin-rollup-bundle](https://github.com/ParamagicDev/snowpack-plugin-rollup-bundle)
- [Full TypeScript definition](https://github.com/snowpackjs/snowpack/tree/master/snowpack/src/types/snowpack.ts).

### onChange()

Get notified any time a watched file changes. This can be useful when paired with the `markChanged()` plugin method, to mark multiple files changed at once.

- See [@snowpack/plugin-sass](https://github.com/snowpackjs/snowpack/tree/master/plugins/plugin-sass/plugin.js) for an example of how to use this method.
- [Full TypeScript definition](https://github.com/snowpackjs/snowpack/tree/master/snowpack/src/types/snowpack.ts).

## Plugin API Methods

### this.markChanged()

```js
// Called inside any plugin hooks
this.markChanged('/some/file/path.scss');
```

Manually mark a file as changed, regardless of whether the file changed on disk or not. This can be useful when paired with the `markChanged()` plugin hook, to mark multiple files changed at once.

- See [@snowpack/plugin-sass](https://github.com/snowpackjs/snowpack/tree/master/plugins/plugin-sass/plugin.js) for an example of how to use this method.
- [Full TypeScript definition](https://github.com/snowpackjs/snowpack/tree/master/snowpack/src/types/snowpack.ts).

## Publishing a Plugin

To share a plugin with the world, you can publish it to npm. For example, take a look at [snowpack-plugin-starter-template](https://github.com/snowpackjs/snowpack-plugin-starter-template) which can get you up-and-running quickly. You can either copy this outright or simply take what you need.

In general, make sure to mind the following checklist:

- ✔️ Your `package.json` file has a `main` entry pointing to the final build
- ✔️ Your code is compiled to run on Node >= 10
- ✔️ Your package README contains a list of custom options, if your plugin is configurable

## Back to Main Docs

👉 **[Back to the main docs.](/)**
