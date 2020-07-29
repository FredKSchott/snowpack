---
layout: layouts/extend.njk
---

#### Who is this page for?

- Anyone writing a custom plugin for Snowpack.
- Anyone extending Snowpack's default behavior.
- Anyone adding framework-specific auto-HMR.
- Anyone using Snowpack programmatically (ex: `snowpack.install()`).

Looking for help using Snowpack in your project?
👉 **[Check out our main docs.](/)**

## Plugin Overview

A **Snowpack Plugin** is an object interface that lets you customize Snowpack's behavior. Snowpack provides different hooks for your plugin to connect to. For example, you can add a plugin to handle Svelte files, optimize CSS, convert SVGs to React components, run TypeScript during development, and much more.

Snowpack's plugin interface is inspired by Rollup. If you've ever written a Rollup plugin before, then hopefully these concepts and terms feel familiar.

### Build Plugins

Snowpack uses an internal **Build Pipeline** to build files in your application for development and production. Every source file passes through the build pipeline, which means that Snowpack can build more than just JavaScript. Images, CSS, SVGs and more can all be built by Snowpack.

Snowpack runs each file through the build pipeline in two separate steps:

1. **Load:** Snowpack finds the first plugin that claims to `resolve` the given file. It then calls that plugin's `load()` method to load the file into your application. This is where compiled languages (TypeScript, Sass, JSX, etc.) are loaded and compiled to something that can run on the web (JS, CSS, etc).
2. **Transform:** Once loaded, every file passes through the build pipeline again to run through matching `transform()` methods. Plugins can transform a file to modify or augment its contents before finishing the file build.

### Dev Tooling Plugins

Snowpack plugins support a `run()` method which lets you run any CLI tool and connect its output into Snowpack. You can use this to run your favorite dev tools (linters, TypeScript, etc.) with Snowpack and automatically report their output back through the Snowpack developer console. If the command fails, you can optionally fail your production build.

### Bundler Plugins

Snowpack builds you a runnable, unbundled website by default, but you can optimize this final build with your favorite bundler (webpack, Rollup, Parcel, etc.) through the plugin `bundle()` method. When a bundler plugin is used, Snowpack will run the bundler on your build automatically to optimize it.  

Snowpack’s bundler plugin API is the one part of the API that is still marked as experimental and may change in a future release. See our official bundler plugins for an example of using the current interface:

- [@snowpack/plugin-parcel](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-parcel)
- [@snowpack/plugin-webpack](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-webpack)


## How to Write a Plugin

### Getting Started

To create a Snowpack plugin, you can start with the following file template:

```js
// my-snowpack-plugin.js
module.exports = function(snowpackConfig, pluginOptions) {
  return {
    name: 'my-snowpack-plugin',
    // ...
  }
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


### Transform a File

For our first example, we’ll look at transforming a file.

```js
module.exports = (snowpackConfig, pluginOptions) => ({
  name: 'my-commenter-plugin',
  async transform({ fileExt, filePath, contents, isDev }) {
    if (fileExt === '.js') {
      return `/* I’m a comment! */ ${contents}`;
    }
  }
})
```

This simple plugin takes all JavaScript files and prepends a simple comment (`/* I’m a comment */`) to the beginning of each file. Even though this is a contrived example, it introduces us to the plugin API.

- The **name** property should be the name of your plugin. This is usually the same as your package name if published to npm.
- The **transform** method is the function that transforms your file and returns the new file contents to use in the build. Notice that this gets called on every file, so it's up to you to check the file path & extension before performing your transformation.

This covers the basics of single-file transformations. In our next example, we’ll show how to compile a source file and change the file extension in the process.

### Build From Source

For a more complicated example, we’ll take one input file (`.svelte`) and use it to generate 2 output files (`.js` and `.css`).

```js
const babel = require("@babel/core");

module.exports = (snowpackConfig, pluginOptions) => ({
  name: 'my-babel-plugin',
  resolve: {
    input: ['.js', '.jsx', '.ts', '.tsx'],
    output: ['.js'],
  },
  async load({ filePath }) {
    const result = await babel.transformFileAsync(filePath);
    return result.code;
  }
})
```

This is a simplified version of the official Snowpack Babel plugin.

In this example, we have a plugin that uses Babel to load & build all JavaScript, TypeScript, and JSX files in your application. JavaScript, the single `resolve.output` format, is returned in the final build.

To see this in action, let's say that we have a source file at `src/components/App.jsx`. Because the `.jsx` file extension is in our plugin `resolve.input` array, Snowpack knows that this plugin is responsible for loading this file type. `load()` executes, the JSX is built with Babel, and JavaScript is returned by the function and sent through to the final build.


### Multi-File Building

For a more complicated example, we’ll take one input file (`.svelte`) and use it to generate 2 output files (`.js` and `.css`).

```js
const fs = require("fs").promises;
const svelte = require("svelte/compiler");

module.exports = (snowpackConfig, pluginOptions) => ({
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
})
```

This is a simplified version of the official Snowpack Svelte plugin.

You don’t need to be familiar with Svelte, but in this example just know we want to take in Svelte files (`.svelte`) and generate JS & CSS for our final build. We can see how that’s reflected in the **resolve** input (`['.svelte']`) and output (`['.js', '.css']`). When we run `svelte.compile()` we get back our CSS and JS, and return an object with entries that match those **resolve** output entries: `{ '.js': …, '.css': … }`.

To see this in action, let's say that we have a source file at `src/components/App.svelte`. Because the `.svelte` file extension is in our plugin `resolve.input` array, Snowpack knows that this plugin is responsible for loading that file in our build. `load()` will then execute, and Snowpack will take the `.js` and `.css` results from the return object to generate the 2 build results: `src/components/App.js` and `src/components/App.css`. Snowpack will always keep the original file name (`App`) and only ever change the extension in the build. 

Also notice that `.svelte` is missing from `output`. That tells Snowpack the original `.svelte` file isn’t needed in the final build once it's been compiled to JS & CSS. If we wanted to keep the original source file in the final build, we could simply add `{ '.svelte': contents }` to the return object.

⚠️ _Note: if your plugin returns different `input`s and `output`s, make sure you’re outputting only the files that should exist in the final build! Anything not included in the return result will be excluded from the final build._


### Optimizing & Bundling

Snowpack supports pluggable bundlers and other build optimizations via the `optimize()` hook. This method runs after the build and gives plugins a chance to optimize the final build directory. Webpack, Rollup, and other build-only optimizations should use this hook.

```js
module.exports = (snowpackConfig, pluginOptions) => ({
  name: 'my-custom-webpack-plugin',
  async optimize({ buildDirectory, log }) {
    await webpack.run({...});
  }
})
```

This is an (obviously) simplified version of the `@snowpack/plugin-webpack` plugin. When the build command has finished building your application, this plugin hook is called with the `buildDirectory` path as an argument. It's up to the plugin to read build files from this directory and write any changes back to the directory. Changes should be made in place, so only write files at the end and be sure to clean up after yourself (if a file is no longer needed after optimizing/bundling, it is safe to remove).


### Tips / Gotchas

- Remember: A source file will always be loaded by the first `load()` plugin to claim it, but the build result will be run through every `transform` function.
- Extensions in Snowpack always have a leading `.` character (e.g. `.js`, `.ts`). This is to match Node’s `path.extname()` behavior, as well as make sure we’re not matching extension substrings (e.g. if we matched `js` at the end of a file, we also don’t want to match `.mjs` files by accident; we want to be explicit there).
- The `resolve.input` and `resolve.output` file extension arrays are vital to how Snowpack understands your build pipeline, and are always required for `load()` to run correctly.
- If `load()` or `transform()` don't return anything, the file isn’t transformed. 
- If you want to build a plugin that only runs some code on initialization (such as `@snowpack/plugin-dotenv`), put your side-effect code inside the function that returns your plugin. But be sure to still return a plugin object. A simple `{ name }` object will do.

## Plugin API

Check out our ["SnowpackPlugin" TypeScript definition](https://unpkg.com/browse/snowpack@2.6.4/dist-types/config.d.ts) for a fully documented and up-to-date summary of the Plugin API and all supported options.

### knownEntrypoints

```
// Example: Svelte plugin needs to make sure this dependency can be loaded.
knownEntrypoints: ["svelte/internal"]
```

An list of any npm dependencies that are added as a part of `load()` or `transform()` that Snowpack will need to know about. Snowpack analyzes most dependency imports automatically when it scans the source code of a project, but some imports are added as a part of a `load()` or `transform()` step, which means that Snowpack would never see them. If your plugin does this, add them here.

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
- [Full TypeScript definition](https://unpkg.com/browse/snowpack@2.6.4/dist-types/config.d.ts).

### load()

Load a file from disk and build it for your application. This is most useful for taking a file type that can't run in the browser (TypeScript, Sass, Vue, Svelte) and returning JS and/or CSS. It can even be used to load JS/CSS files directly from disk with a build step like Babel or PostCSS.

- See above for an example of how to use this method.
- [Full TypeScript definition](https://unpkg.com/browse/snowpack@2.6.4/dist-types/config.d.ts).

### transform()

Transform a file's contents. Useful for making changes to all types of output (JS, CSS, etc.) regardless of how they were loaded from disk.

- See above for an example of how to use this method.
- [Full TypeScript definition](https://unpkg.com/browse/snowpack@2.6.4/dist-types/config.d.ts).

### run()

Run a CLI command, and connect it's output into the Snowpack console. Useful for connecting tools like TypeScript.

- [Full TypeScript definition](https://unpkg.com/browse/snowpack@2.6.4/dist-types/config.d.ts).

### optimize()

Snowpack’s bundler plugin API is still experimental and may change in a future release. See our official bundler plugins for an example of using the current interface:

- Example: [@snowpack/plugin-parcel](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-parcel)
- Example: [@snowpack/plugin-webpack](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-webpack)
- [Full TypeScript definition](https://unpkg.com/browse/snowpack@2.6.4/dist-types/config.d.ts).


## Publishing a Plugin

To share a plugin with the world, you can publish it to npm. For example, take a look at [snowpack-plugin-starter-template](https://github.com/pikapkg/snowpack-plugin-starter-template) which can get you up-and-running quickly. You can either copy this outright or simply take what you need.

In general, make sure to mind the following checklist:

- ✔️ Your `package.json` file has a `main` entry pointing to the final build
- ✔️ Your code is compiled to run on Node >= 10
- ✔️ Your package README contains a list of custom options, if your plugin is configurable


## Back to Main Docs

👉 **[Back to the main docs.](/)**
