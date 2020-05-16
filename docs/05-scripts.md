## Build Scripts

Snowpack is more than just a static file server, it's a platform to power your entire build pipeline. Babel, TypeScript, PostCSS, and any favorite build tool can be connected directly into Snowpack via simple, 1-line transformations. These transformations are called **"build scripts".**

### What are Build Scripts?

A build script is just a simple bash (CLI) command. Snowpack will  pipe your source files into matching script commands (via stdin) and then sending it's output (via stdout) to the browser or build directory.

If you've ever worked with `package.json` "scripts", creating your own build scripts should hopefully feel familiar:

```js
// snowpack.config.json
{
  "scripts": {
    // Pipe every .css file through PostCSS CLI
    "build:css": "postcss",
    // Pipe every .js & .jsx file through Babel CLI
    "build:js,jsx": "babel --filename $FILE"
  }
}
```

**The `"build"` script type is the basic building block of any Snowpack build pipeline.** In this example `babel` & `postcss` are both used to process your code at dev time and then again when building for production. Each file is piped through the proper CLI to get the final build output.


```html
<!-- Example: Load "src/index.jsx" in the browser -->
<script type="module" src="/src/index.js"></script>
```

**By default, build scripts are run against every matching file in your project.** For large/complex projects, we recommend that you organize your source code into subdirectories (`src/`, `public/`, etc). Check out the section on "mount:" scripts below for more information.


 
### All Script Types

Snowpack supports several other script types in addition to the basic `"build"` type. These different script types serve different goals so that you can fully customize and control your dev environment:

- `"mount:*": "mount DIR [--to URL]"`
  - Copy a folder directly into the final build at the `--to` URL location.
  - If no `--to` argument is provided, the directory will be hosted at the same relative location.
  - ex: `"mount:public": "mount public --to ."`
  - ex: `"mount:web_modules": "mount web_modules"`
- `"build:*": "..."`
  - Pipe any matching file into this CLI command, and write it's output to disk.
  - ex: `"build:js,jsx": "babel --filename $FILE"`
- `"run:*": "..."`
  - Run a single command once, log any output/errors.
  - Useful for tools like TypeScript that lint multiple files / entire projects at once.
  - ex: `"run:ts,tsx": "tsc"`
- `"plugin:*": "..."`
  - Connect a custom Snowpack plugin. See the section below for more info.

### Script Variables

Snowpack provides a few variables that you can use to make your build scripts (and plugins) more dynamic. Snowpack will replace these with the correct value when run:

- `$1` - The original command of a script modifier.
  - Useful to reduce copy-pasting in your scripts.
  - ex: `"run:ts,tsx::watch": "$1 --watch"`
- `$FILE` - The absolute path of the source file.
  - Especially useful when Babel plugins require it.
  - ex: `"build:js": "babel --filename $FILE`


### "::" Script Modifiers

You can extend your build scripts via the `"::"` script modifier token. These act as addons to a previous matching script that extend that script's behavior:

- `"run:*::watch"`
  - This adds a watch mode to a previous "run" script, so that you can turn any supported linter into a live-updating watch command during development. 
  
```js
// snowpack.config.json
{
  "scripts": {
    // During build, runs TypeScript to lint your project.
    "run:ts,tsx": "tsc --noEmit",
    // During dev, runs `tsc --noEmit --watch` for live feedback.
    "run:ts,tsx::watch": "$1 --watch",
  }
}
```

Note that `$1` can be used with a script modifier to reference the original script. See section on [Script Variables](#script-variables) above.



### Build Plugins

For a more powerful integration, you can also write build scripts using JavaScript to create *build plugins*. Each plugin is loaded as a JavaScript module that exports custom `build()` and `lint()` functions that are run on matching files.

There are a few reasons you may want to use a build plugin instead of a normal "build:" or "lint:" CLI command script:

**Speed:** Some CLIs may have a slower start-up time, which may become a problem as your site grows. Plugins can be faster across many files since they only need to be loaded & initialized once and not once for every file.

```js
"scripts": {
  // Speed: The build plugin is ~10x faster than using the Babel CLI directly
  "plugin:js,jsx": "@snowpack/plugin-babel",
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

### Build Plugin API

Coming Soon!
