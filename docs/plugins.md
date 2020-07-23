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

## Overview

There are two types of Snowpack plugins: **build plugins** and **bundler plugins.** Unless you are making a plugin specifically for a bundler like Rollup, Parcel, or webpack, you’re probably making a build plugin.

## Build Plugins

Build plugins run on single files that pass through Snowpack. They listen for particular file extensions, and when a match is found, transform that code.

In order to keep operations speedy, Snowpack’s build system is **single pass,** meaning each file is only transformed by a set of plugins once. We’ll talk more about that later.

### The Basics

To create a Snowpack plugin, you may start with the following template:

```js
// my-snowpack-plugin.js

module.exports = function(snowpackConfig, pluginOptions) {
  name: 'my-snowpack-plugin', // plugin name
  input: ['.js', '.ts'], // extensions to listen for
  output: ['.js'], // extensions that will be output
  async build(buildOptions) { /* … */ } // code transformations
}
```

We start with a **function** that accepts 2 parameters, in this order:

  1. the [Snowpack configuration object](/#all-config-options) (`snowpackConfig`)
  1. (optional) custom plugin options (`pluginOptions`)

That single function should return a Snowpack Plugin **object** with the following properties:

| Key                |    Type    | Description                                                                               |
|:-------------------|:----------:|:------------------------------------------------------------------------------------------|
| `name`             |  `string`  | The plugin name. This will be shown whenever there are errors or messages.                |
| `input`            | `string[]` | An array of file extensions this plugin listens for (e.g. `['.js', '.jsx', '.ts']`)       |
| `output`           | `string[]` | An array of file extensions this plugin may output (e.g. `['.js', '.css']`)               |
| `knownEntrypoints` | `string[]` | Array of npm dependencies this plugin needs to include all of (e.g. `['svelte/internal']` |
| `build()`          | `function` | An async function that takes file info and returns transformed code.                      |

Let’s look at some examples to see the basics in action:

#### Single file transformation

For our first example, we’ll look at transforming files 1:1.

```js
module.exports = (snowpackConfig, pluginOptions) => ({
  name: 'my-commenter-plugin',
  input: ['.js', '.mjs', '.jsx', '.ts', '.tsx'],
  async build({ contents }) {
    return `/* I’m a comment! */ ${contents}`;
  }
})
```

This simple plugin takes all JavaScript & TypeScript files (`['.js', '.mjs', '.jsx', '.ts', '.tsx']`), and prepends a simple comment (`/* I’m a comment */`) to the beginning of each file. Even though this is a contrived example, it introduces us to the plugin API.

Our plugin **name** should be the same as name as the package (or if it’s a local plugin, give it a name).

The **input** of the plugin is an array of file extensions we want to listen to. Notice we could have only specified `['.js']` if we wanted to, but in our example we wanted to listen for JSX and TypeScript files as well.

And lastly, the meat of our plugin lives in `build()`. We took the `contents` of the original file, and added our comment to the beginning. And that’s it! That string turns back into JavaScript. ✨ Magic! 🦄

This covers the basics of single-file transformations. In our next example, we’ll see how to do complex transformations on multiple files at once.

#### Multi-file transformation

For a more complicated example, we’ll take one input file (`.svelte`) and use it to generate 2 output files (`.js` and `.css`).

```js
const svelte = require("svelte/compiler");

module.exports = (snowpackConfig, pluginOptions) => ({
  name: 'my-svelte-plugin',
  input: ['.svelte'],
  output: ['.js', '.css'],
  knownEntrypoints: ['svelte/internal'],
  async build({ contents, filePath }) {
    const { js, css } = svelte.compile(codeToCompile, { filename: filePath });

    return {
      '.js': js && js.code,
      '.css': css && css.code,
    };
  }
})
```

This is a simplified version of the official Snowpack Svelte plugin, simplified to make the intent clearer.

You don’t need to be familiar with Svelte, but in this example just know we want to take in Svelte files (`.svelte`) and generate JS & CSS from them. We can see how that’s reflected in the **input** (`['.svelte']`) and **output** (`['.js', '.css']`). When we run `svelte.compile()` we get back our CSS and JS, and pass that back as an object to Snowpack: `{ '.js': …, '.css': … }`.

Say the original input file was `src/components/App.svelte`. Because `.svelte` is in `input`, that file will trigger this plugin. `build()` will then execute, and Snowpack will take the `.js` and `.css` from the return object to generate 2 files: `src/components/App.js` and `src/components/App.css`. Snowpack kept the `App` filename and only changed the extension. Because your plugin only has to worry about individual files, and not the system at large, plugins are easier to write and maintain and easier to chain together.

Also notice that `.svelte` is missing from `output`. That tells Snowpack the original `.svelte` file isn’t needed for output, so it’s left in source and not copied to production. However, if we wanted to pass that through, we could simply add `{ '.svelte': contents }` to the return object.

⚠️ _Note: if your plugin returns different `input`s and `output`s, make sure you’re not deleting files that other plugins may need! Likewise, make sure you’re outputting necessary files for the final build._

#### Complete Build Plugin API

All options available:

```js
module.exports = (snowpackConfig, pluginOptions) => ({
  async build({
    contents, // file contents (could be UTF-8 or binary depending on the file)
    fileExt, // file extension (e.g. '.js')
    filePath, // complete file path (⚠️ Warning! This may not exist on disk, so don’t try and perform file operations on)
    isDev, // is this the Snowpack dev server?
  }) {

    /* Option A: transform file 1:1 */
    // return string;

    /* Option B: transform and rename file, or generate other files */
    // return {
    //   '.js': jsFileContents,
    //   '.js.map': jsMapContents,
    //   '.css': cssFileContents'
    //   …
    // };
  }
})
```

### Build your own

#### Local plugin

If you need a local plugin just for your own needs, add it in your `snowpack.config.json`:

```json
{
  "plugins": [
    ["../path-to-my-plugin", { "optionA": "foo", "optionB": "bar" }]
  ]
}
```

#### npm plugin

To release a plugin to npm, take a look at [snowpack-plugin-starter-template](https://github.com/pikapkg/snowpack-plugin-starter-template) which can get you up-and-running quickly. You can either copy this outright or simply take what you need.

In general, make sure to mind the following checklist:

- ✔️ Your `package.json` file has a `main` entry pointing to the final build
- ✔️ Your code is compiled to run on Node >= 10
- ✔️ Your package README contains a list of custom options, if your plugin is configurable

### Tips / Gotchas

- Snowpack’s plugin system is **single-pass** to keep things speedy and avoid infinite loops. That means if you generate a new `.css` file, that file won’t be run back through another CSS plugin.
- Extensions in Snowpack always have a leading `.` character (e.g. `.js`, `.ts`). This is to match Node’s `path.extname()` behavior, as well as make sure we’re not matching extension substrings (e.g. if we matched `js` at the end of a file, we also don’t want to match `.mjs` files by accident; we want to be explicit there).
- You may have seen a `transform()` function in previous versions of the plugin API. Though that’ll be supported throughout Snowpack `2.x`, it’s now deprecated and will be removed in the next major release. Instead, please use `build()`.
- The `input` and `output` file extension arrays are the keys to their simplicity. In other plugin systems, you have to parse out the filename to determine whether you want to transform it or not. But with Snowpack, you only have to declare file extensions you’d like to listen for, and Snowpack handles the rest.
- If `build()` doesn’t return anything, the file isn’t transformed. In this way, you can build pure side-effect plugins if needed.
- If you want to build a plugin that only runs some code on initialization (such as `@snowpack/plugin-dotenv`), put your side-effect code inside your main plugin function to execute when initialized. But be sure to return a `{ name }` so that users know what went wrong in the case of an error.

## Bundler Plugin

Snowpack’s bundler plugin API is still experimental and may change in a future release. See our official bundler plugins for an example of using the current interface:

- [@snowpack/plugin-parcel](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-parcel)
- [@snowpack/plugin-webpack](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-webpack)


## Back to Main Docs

👉 **[Back to the main docs.](/)**
