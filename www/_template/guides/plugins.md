---
layout: layouts/content.njk
title: Creating Your Own Plugin
description: Learn the basics of our Plugin API through working examples.
---

A **Snowpack Plugin** lets you customize Snowpack's behavior. Snowpack provides different hooks for your plugin to connect to. For example, you can add a plugin to handle Svelte files, optimize CSS, convert SVGs to React components, run TypeScript during development, and much more.

This guide takes you though creating and publishing your first plugin.

You'll learn
- The basic structure of Snowpack plugins
- How to choose the right hooks from the Snowpack Plugin API
- How to publish your plugin and add it to our [Plugin](/plugins) directory

Prerequisites: This guide assumes basic understanding of Node.js, npm, and JavaScript.

## Creating and testing a basic plugin
In this step you'll a `.js` file that exports a [function that returns a plugin object](/reference/configuration). This function can be called with plugin-specific options.

Create a directory for your plugin called `my-snowpack-plugin` and inside it create a `my-snowpack-plugin.js` file:

```js
// my-snowpack-plugin.js
// Example: a basic Snowpack plugin file, customize the name of the file and the value of the name in the object
// snowpackConfig = The Snowpack configuration object
// pluginOptions = user-provided configuration options
module.exports = function (snowpackConfig, pluginOptions) {
  return {
    name: 'my-snowpack-plugin'
  };
};
```

To test your new plugin, run `npm init` to create a basic `package.json` then run `npm link` in your plugin’s directory to expose the plugin globally (on your development machine).

For testing, [create a new, example Snowpack project](/tutorials/getting-started) in a different directory. In your example Snowpack project, run `npm install && npm link my-snowpack-plugin` (use the name from your plugin’s `package.json`).

> The alternative would be to use `npm install --save-dev path_to_your_plugin`, which would create the "symlink-like" entry in your example Snowpack project’s `package.json`

In your example Snowpack project, add your plugin to the `snowpack.config.js` along with any plugin options you’d like to test:

```js
// snowpack.config.js
// Example: enabling a Snowpack plugin called "my-snowpack-plugin"
{
  "plugins": [
    "my-snowpack-plugin"
  ]
}
```

TODO: how to test

## Adding user-configurable options to your plugin
TODO make this a real example
In this step, you'll learn how to add user-configurable options to your plugin and to use them in your plugin code.

In your example Snowpack project, instead of enabling the plugin as a string containing the plugin name, use an array.  The first item is name of your plugin and the second a new object containing the plugin options.

```diff
// snowpack.config.js
{
  "plugins": [
-    "my-snowpack-plugin"
+    ["my-snowpack-plugin", { "optionA": "foo", "optionB": true }]
  ]
}
```

You access these through the `pluginOptions`

```diff
// my-snowpack-plugin.js
module.exports = function (snowpackConfig, pluginOptions) {
+ let optionA = pluginOptions.optionA
+ let optionB = pluginOptions.optionB
  return {
    name: 'my-snowpack-plugin'
  };
};
```


## Choosing the right hook from The Snowpack Plugin API
The plugin API has four main hooks you'll use to integrate with Snowpack. Hooks are methods that Snowpack calls automatically when running. Choosing the right one depends on what part of the build pipeline you want your plugin to act on and what type of actions it performs:

- Build plugins act on the raw files in your Snowpack project. They use the `resolve` object and `load()` hook. For example [@snowpack/plugin-sass](https://github.com/snowpackjs/snowpack/tree/main/plugins/plugin-sass) compiles SASS files to CSS files.
- Transform plugins run on the HTML, JS, and CSS files Snowpack built from your raw file. These utilize the `transform()` hook. An example is [@snowpack/plugin-postcss](https://github.com/snowpackjs/snowpack/tree/main/plugins/plugin-postcss), which runs postcss to optimize CSS.
- Bundler plugins replace the default [`snowpack build`](/concepts/build-pipeline) using the `optimize()` hook. An example is [@snowpack/plugin-webpack](https://github.com/snowpackjs/snowpack/tree/main/plugins/plugin-webpack) which bundles the final build using Webpack.
- Dev tooling plugins run during `snowpack dev` OR `snowpack build` using the `run()` hook. For example [@snowpack/plugin-run-script](https://github.com/snowpackjs/snowpack/tree/main/plugins/plugin-run-script) runs any CLI command during `snowpack dev` or `snowpack build`.

TODO: When do you choose a dev tooling vs. other types?

## Build plugins: Using `resolve` and `load()` hook
In this step you'll turn your example plugin into a build plugin that takes a variety of types of files and outputs JavaScript.

If you modified `my-snowpack-plugin.js`, go back and replace it with the basic code from "Creating and testing a basic plugin."

You'll need to install Babel
```bash
npm install --save-dev @babel/core
```

Then require Babel in your `my-snowpack-plugin.js`
```diff
// my-snowpack-plugin.js
+ const babel = require('@babel/core');
module.exports = function (snowpackConfig, pluginOptions) {
```

TODO: Link to API docs
The next thing you need is the `resolve` object with `input` and `output` keys.

You don't need to know Babel, just that it takes JavaScript and Typescript files and compiles them to browser-friendly JavaScript files. So our `input` is the types of files Babel will compile and the `output` is the final product:

```diff
// my-snowpack-plugin.js

  return {
    name: 'my-snowpack-plugin'
+   resolve: {
+     input: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
+     output: ['.js'],
    },
```

Next you'll want to call the `load` hook. This loads the files matching the input extensions.
```diff
// my-snowpack-plugin.js

   resolve: {
      input: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
      output: ['.js'],
    },
+    async load({ filePath }) {
+      const result = await babel.transformFileAsync(filePath);
+      return result.code;
+    },
```

It's here you do any of the actual things specific to your plugin. In this case we use Babel's `transformFileAsync` to load the file from the filePath.

Then we return the result, which Snowpack knows is a JavaScript file.


> `load()` provides information about the file ([see parameters in the Plugin API documentation]()), you'll need to use another method if you want to parse the contents like Node's `fs`. Here Babel’s `transformFileAsync` both gets the contents and transforms the file so we don’t need `fs`.



TODO: Testing it
**See it in action:** Let's say that we have a source file at `src/components/App.jsx`. Because the `.jsx` file extension matches an extension in our plugin's `resolve.input` array, Snowpack lets this plugin claim responsibility for loading this file. `load()` executes, Babel builds the JSX input file from disk, and JavaScript is returned to the final build.

----
IN PROGRESS

## Using the `transform()` hook


## Using the `optimize()` hook


### Example: Transform a file with a transform plugin

For our first example we’ll look at a very simple transform plugin. This plugin uses the `transform()` method to add a comment to all `.js` files.

```js
// my-snowpack-plugin.js
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

The object returned by this function is a **Snowpack Plugin**. A plugin consists of a `name` property and some hooks into the Snowpack lifecycle to customize your build pipeline or dev environment. In the example above we have:

- The **name** property: The name of your plugin. This is usually the same as your package name if published to npm.
- The **transform** method: A function that allows you to transform & modify built files. In this case, we add a simple comment (`/* I’m a comment */`) to the beginning of every JS file in your build.








## Example: Convert markdown to HTML with a build plugin

This example is very similar to the previous one.
You could use this method to write a plugin to parse Markdown (`.md`), Nunjucks (`.njk`) or templating languages into HTML. Here is an example that parses Markdown into HTML:

```js
// my-snowpack-plugin.js
const { parse } = require('markdown-wasm/dist/markdown.node.js');
const fs = require('fs');

module.exports = function plugin(snowpackConfig, pluginOptions = {}) {
  return {
    name: 'my-markdown-parser',
    resolve: {
      input: ['.md', '.markdown'],
      output: ['.html'],
    },
    load: ({ filePath }) => {
      const markdown = fs.readFileSync(filePath, 'utf-8');
      const code = parse(markdown, pluginOptions);
      return {
        '.html': code,
      };
    },
  };
};
```

### Example: Multi-file building

For a more complicated example, we’ll take one input file (`.svelte`) and use it to generate 2 output files (`.js` and `.css`).

```js
// my-snowpack-plugin.js
const fs = require('fs').promises;
const svelte = require('svelte/compiler');

module.exports = function (snowpackConfig, pluginOptions) {
  return {
    name: 'my-svelte-plugin',
    resolve: {
      input: ['.svelte'],
      output: ['.js', '.css'],
    },
    async load({ filePath }) {
      const fileContents = await fs.readFile(filePath, 'utf-8');
      const { js, css } = svelte.compile(fileContents, { filename: filePath });
      return {
        '.js': js && js.code,
        '.css': css && css.code,
      };
    },
  };
};
```

This is a simplified version of the official Snowpack Svelte plugin. Don't worry if you're not familiar with Svelte, just know that building a Svelte file (`.svelte`) generates both JS & CSS for our final build.

In that case, the `resolve` property takes only a single `input` file type (`['.svelte']`) but two `output` file types (`['.js', '.css']`). This matches the result of Svelte's build process and the returned entries of the `load()` method.

**See it in action:** Let's say that we have a source file at `src/components/App.svelte`. Because the `.svelte` file extension matches an extension in our plugin's `resolve.input` array, Snowpack lets this plugin claim responsibility for loading this file. `load()` executes, Svelte builds the file from disk, and both JavaScript & CSS are returned to the final build.

> Notice that `.svelte` is missing from `resolve.output` and isn't returned by `load()`. Only the files returned by the `load()` method are included in the final build. If you wanted your plugin to keep the original source file in your final build, you could add `{ '.svelte': contents }` to the return object.

### Example: Server-Side Rendering (SSR)

Plugins can produce server-optimized code for SSR via the `load()` plugin hook. The `isSSR` flag tells the plugin that Snowpack is requesting your file for the server, and that it will expect a response that will run on the server.

Some frameworks/languages (like React) run the same code on both the browser and the server. Others (like Svelte) will create different output for the server than the browser. In the example below, we use the `isSSR` flag to tell the Svelte compiler to generate server-optimized code when requested by Snowpack.

```js
// my-snowpack-plugin.js
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

### Example: Optimizing & bundling

Snowpack supports pluggable bundlers and other build optimizations via the `optimize()` hook. This method runs after the build and gives plugins a chance to optimize the final build directory. Webpack, Rollup, and other build-only optimizations should use this hook.

```js
// my-snowpack-plugin.js
module.exports = function(snowpackConfig, pluginOptions) {
  return {
    name: 'my-custom-webpack-plugin',
    async optimize({ buildDirectory }) {
      await webpack.run({...});
    }
  };
};
```

This is an (obviously) simplified version of the `@snowpack/plugin-webpack` plugin. When the build command has finished building your application, this plugin hook is called with the `buildDirectory` path as an argument. It's up to the plugin to read build files from this directory and write any changes back to the directory. Changes should be made in place, so write files only at the end and be sure to clean up after yourself (if a file is no longer needed after optimizing/bundling, it is safe to remove).

### Publishing a plugin

To share a plugin with the world, you can publish it to npm. For example, take a look at [snowpack-plugin-starter-template](https://github.com/snowpackjs/snowpack-plugin-starter-template) which can get you up-and-running quickly. You can either copy this outright or simply take what you need.

In general, make sure to mind the following checklist:

- ✔️ Your `package.json` file has a `main` entry pointing to the final build
- ✔️ Your code is compiled to run on Node >= 10
- ✔️ Your package README contains a list of custom options, if your plugin is configurable

### Tips / Gotchas

- Remember: A source file will always be loaded by the first `load()` plugin to claim it, but the build result will be run through every `transform` function.
- Snowpack will always keep the original file name (`App`) and only ever change the extension in the build.
- Extensions in Snowpack always have a leading `.` character (e.g. `.js`, `.ts`). This is to match Node’s `path.extname()` behavior, as well as make sure we’re not matching extension substrings (e.g. if we matched `js` at the end of a file, we also don’t want to match `.mjs` files by accident; we want to be explicit there).
- The `resolve.input` and `resolve.output` file extension arrays are vital to how Snowpack understands your build pipeline, and are always required for `load()` to run correctly.
- If `load()` doesn't return anything, the file isn’t loaded and the `load()` of the next suitable plugin is called.
- If `transform()` doesn't return anything, the file isn’t transformed.
- If you want to build a plugin that runs some code only on initialization (such as `@snowpack/plugin-dotenv`), put your side-effect code inside the function that returns your plugin. But be sure to still return a plugin object. A simple `{ name }` object for example.
