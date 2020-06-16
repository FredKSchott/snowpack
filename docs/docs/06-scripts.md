## Build Scripts

Snowpack is more than just a static file server, it's a platform to power your entire build pipeline. Babel, TypeScript, PostCSS, and any favorite build tool can be connected directly into Snowpack via simple, 1-line transformations. These transformations are called **build scripts.**

### Overview

A build script is just a simple bash (CLI) command. Snowpack will  pipe your source files into matching script commands (via stdin) and then send it's output (via stdout) to the browser.

If you've ever worked with `package.json` "scripts", creating your own build scripts should hopefully feel familiar:

```js
// snowpack.config.json
{
  "scripts": {
    // Pipe every .css file through PostCSS CLI
    "build:css": "postcss",
  }
}
```

**The `"build"` script type is the basic building block of any Snowpack build pipeline.** In this example `babel` & `postcss` are both used to process your code at dev time and then again when building for production. Each file is piped through the proper CLI to get the final build output.


```html
<!-- Example: Load "src/index.jsx" in the browser -->
<script type="module" src="/src/index.js"></script>
```

**By default, build scripts are run against every matching file in your project.** For large/complex projects, we recommend that you organize your source code into subdirectories (`src/`, `public/`, etc) that you can whitelist via "mount:" scripts.


 
### All Script Types

Snowpack supports several other script types in addition to the basic `"build"` type. These different script types serve different goals so that you can fully customize and control your dev environment:

- `"build:...": "..."`
  - Build matching files for your application. Snowpack will pipe files into the given bash command (CLI) as input, and capture its output as the build result.
  - ex: `"build:js,jsx": "babel --filename $FILE"`
- `"run:...": "..."`
  - Run a single bash command once, log any output/errors. Useful for tools like TypeScript that lint multiple files / entire projects at once.
  - ex: `"run:tsc": "tsc"`
- `"mount:...": "mount DIR [--to /PATH]"`
  - Copy a folder directly into the final build at the `--to` URL location.
  - If no `--to` argument is provided, the directory will be hosted at the same relative location.
  - ex: `"mount:public": "mount public --to /"`
  - ex: `"mount:web_modules": "mount web_modules"`
- **Deprecated** `"proxy:...": "proxy URL --to /PATH"`  (Use the `proxy` configuration object instead)

### Script Variables

Snowpack provides a few variables that you can use to make your build scripts (and plugins) more dynamic. Snowpack will replace these with the correct value when run:

- `$1` - The original command of a script modifier.
  - Useful to reduce copy-pasting in your scripts.
  - ex: `"run:ts,tsx::watch": "$1 --watch"`
- `$FILE` - The absolute path of the source file.
  - Especially useful when Babel plugins require it.
  - ex: `"build:js": "babel --filename $FILE`
- `$WEB_MODULES` - The location of your web_modules directory.
  - Especially useful for Snowpack internally, but not very useful otherwise.
  - ex: `"mount:web_modules": "mount $WEB_MODULES --to /web_modules`

### Script Modifiers ("::")

You can customize your build scripts even further via the `"::"` script modifier token. These act as addons to a previous matching script that extend that script's behavior:

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

Note that `$1` can be used with a script modifier to reference the original script. See the section on [Script Variables](#script-variables) above.
