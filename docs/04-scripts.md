## Build Scripts

Snowpack is more than just a static file server, it's a platform that can power your entire website build workflow. Babel, TypeScript, PostCSS, and any favorite build tool can be connected directly with Snowpack via simple, 1-line transformations. 

**These transformations are called "build scripts".**

Build scripts only run on files in the `src/` directory. Build scripts are useful or even essential in some projects that rely on custom, non-standard syntax. Svelte, Vue, and even React (via JSX) all need to be built or processed in some way (ex: passed through Babel) before they can run in the browser.

<!--

### Default Build Scripts 

Snowpack provides some basic build scripts out of the box to help you get started. The following are enabled by default durinb both dev & build:

- `build:jsx` - All `src/*.jsx` files are transpiled for basic React & Preact support. 
- `build:ts` - All `src/*.ts` files are transpiled for basic TypeScript support.
- `build:tsx` - All `src/*.tsx` files are transpiled for both JSX & TypeScript.
-->

Snowpack also rewrites your package imports automatically using your installed `web_modules/import-map.json` file. This way uou can import packages by name anywhere in your `src/` directory and Snowpack will automatically rewrite them to point to the proper `/web_modules/*` URL during dev/build.
 
### Custom Build Scripts

A build script is just a simple bash command. Based on the file extension given in the script name, Snowpack will pipe source files into each command (via stdin) and then send it's output (via stdout) to the browser (or writing it to disk, when building your application).

If you've ever worked with `package.json` "scripts", providing your own build scripts should feel familiar.

**The `"build"` script type is the basic building block for any Snowpack dev & build pipeline.** In the following example, `babel`, `postcss`, and `cat` are all used to process a project's `src/` directory at dev time and then again when building for production. Each file is piped through the proper command to get the final build output.

```js
// snowpack.config.json
{
  "scripts": {
    // Run every .js & .jsx file through Babel CLI
    "build:js,jsx": "babel",
    // Run every .css file through PostCSS CLI
    "build:css": "postcss",
    // Run every .svg file through 'cat' (copies the file without transforming)
    "build:svg": "cat"
  }
}
```


### All Script Types

Snowpack supports several other script types in addition to the basic `"build"` type. These different script types serve different goals so that you can fully customize and control your dev environment:

- `"build:*": "..."`
  - Pipe any matching file into this CLI command, and write it's output to disk.
  - ex: `"build:js,jsx": "babel`
- `"lint:*": "..."`
  - Pipe any matching file into this CLI command, and log any output.
  - ex: `"lint:js": "eslint"`
- `"lintall:*": "..."`
  - Run a single command once, log any output.
  - Useful for tools like TypeScript that lint multiple files / entire projects at once.
  - ex: `"lint:ts,tsx": "tsc"`
- `"mount:*": "mount DIR [--to URL]`
  - Copy a folder directly into the final build at the `--to` URL location.
  - If no `--to` argument is provided, the folder will be copied to the same location relative to the project directory.
  - ex: `"mount:public": "mount public --to /"`
  - ex: `"mount:web_modules": "mount web_modules"`
- `"plugin:*": "..."`
  - Connect a custom Snowpack plugins. See the section below for more info.

#### Script Modifiers

Additionally, we support script modifiers via  the `"::"` token. These are addons to a previous matching script that extend that script's behavior:

- `"lintall:*::watch"`
  - This adds a watch mode to a previous "lintall" script, so that you can turn any supported linter into a live-updating watch command during development. 
  
```js
// snowpack.config.json
{
  "scripts": {
    // Run TypeScript to lint your project.
    "lintall:ts,tsx": "tsc --noEmit",
    // Run TypeScript in --watch mode during development for live feedback.
    "lintall:ts,tsx::watch": "$1 --watch",
  }
}
```

Note that `$1` can be used with a script modifier to reference the original script. This is useful so that you don't need to copy-paste the original script in two places.


### Build Plugins

For an even more powerful integration, Snowpack supports first-class plugins built specifically for Snowpack. Instead of running these plugins as CLI commands, each plugin is loaded as a JavaScript module that exports custom `build()` and `lint()` functions.

There are a few reasons you may want to use a plugin instead of a normal "build:" or "lint:" CLI command script:

**Speed:** Some CLIs may have a slower start-up time, which may become a problem as your site grows. Plugins can be faster across many files since they only need to be loaded & initialized once and not once for every file.

```js
"scripts": {
  // Speed: The build plugin is ~10x faster than using the Babel CLI directly
  "plugin:babel": "@snowpack/plugin-babel",
}
```

**Lack of CLI:** Some frameworks, like Svelte, don't maintain dedicated CLIs. Snowpack Plugins allow you to tap into a tool's JS interface directly without building a whole new CLI interface.

```js
"scripts": {
  // Lack of CLI: There is no Svelte CLI. Our plugin taps directly into the Svelte compiler 
  "plugin:svelte": "@snowpack/plugin-svelte",
}
```

**Greater Control:** A plugin is just a set of JavaScript functions, so it's easy to build your own local plugins using JavaScript if you prefer to write your own source code transformation.


```js
"scripts": {
  // Custom Behavior: Feel free to build your own!
  "plugin:vue": "./my-custom-vue-plugin.js",
}
```
