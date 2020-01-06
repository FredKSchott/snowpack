## Usage

Snowpack has a single goal: to install web-ready npm packages to a new `web_modules/` directory in your project. What you build with it (and how you serve that project locally) is entirely up to you. You can use as many or as few tools on top of Snowpack as you'd like. 

Still stuck? See our Quickstart guide above for help to get started.

### Zero-Config Installs (Default)

```
$ npx snowpack
```

By default, Snowpack will attempt to install all "dependencies" listed in your package.json. If the package defines an ESM "module" entrypoint, then that package is installed into your new `web_modules/` directory. 

As long as all of your web dependencies are listed as package.json "dependencies" (with all other dependencies listed under "devDependencies") this zero-config behavior should work well for your project.



### Automatic Installs (Recommended)

```
$ npx snowpack --include "src/**/*.js"
```

With some additional config, Snowpack is also able to automatically detect dependencies by scanning your application for import statements. This is the recommended way to use Snowpack, since it is both faster and more accurate than trying to install every dependency.

To enable automatic import scanning, use the `--include` CLI flag to tell Snowpack which files to scan for. Snowpack will automatically scan every file for imports with `web_modules` in the import path. It will then parse those to find every dependency required by your project.

Remember to re-run Snowpack every time you import an new dependency.


### Whitelist Dependencies

``` js
  /* package.json */
  "snowpack": {
    "webDependencies": [
      "htm",
      "preact",
      "preact/hooks", // A package within a package
      "unistore/full/preact.es.js", // An ESM file within a package (supports globs)
      "bulma/css/bulma.css" // A non-JS static asset (supports globs)
    ],
  }
```

Whitelist any dependencies by defining them in your "webDependencies" config (see below). You can use this to control exactly which packages are installed OR use this together with the   `--include` flag to include additional non-JS assets in your `web_modules/` directory.


### Import Packages by Name

``` js
/* .babelrc */
  "plugins": [
    ["snowpack/assets/babel-plugin.js"],
  ]
```

Importing packages by name (ex: `import React from 'react'`) isn't supported in any modern browsers. Unless you're using a traditional app bundler or a build tool like Babel, you'll need to import all dependencies in your application by URL (ex: `import React from '/web_modules/react.js'`).

If you are using Babel, you can use the Snowpack Babel Plugin to transform your imports automatically at build time. The plugin reads any packages name imports in your files and rewrites them to full URLs that run in the browser.




## Advanced Usage

### Optimize for Production

```
$ npx snowpack --optimize
```

By default, Snowpack installs dependencies un-minified. You can run minification and other production optimizations on your installation by running `snowpack` with the `--optimize` flag. 



### Run on Every "npm install"

``` js
  /* package.json */
  "scripts": {
    "prepare": "snowpack"
  }
```

Optionally, you can add "snowpack" as a `"prepare"` script to your `package.json` and npm/yarn will run it after every new dependency install. This is recommended so that new dependencies are automatically included in your `web_modules/` directory.
    


### Customize Browser Support

```js
  /* package.json */
  "browserslist": " >0.75%, not ie 11, not UCAndroid all, not OperaMini all",
```

By default, Snowpack runs all dependencies through Babel via `@preset/env` to transpile any unsupported language features found in your dependencies. By default, Snowpack will use the string shown above, but you can customize this behavior by setting your own "browserslist" key in your `package.json` manifest.



### All CLI Options

Run Snowpack with the `--help` flag to see a list of all supported options to customize how Snowpack installs your dependencies.

```bash
npx snowpack --help
```


### All Config Options

> *Note: All package.json options are scoped under the `"snowpack"` property.*

* `"webDependencies"`: (Recommended) Set exactly which packages to install with Snowpack. Without this, Snowpack will just try to install every package in your "dependencies" config. That behavior is great for getting started but it won't warn you if an expected package fails to install. 
* `"namedExports"`: (Optional) If needed, you can explicitly define named exports for any dependency. You should only use this if you're getting `"'X' is not exported by Y"` errors without it. See [rollup-plugin-commonjs](https://github.com/rollup/rollup-plugin-commonjs#usage) for more info.
* `"dedupe"`: (Optional) If needed, force resolving for these modules to root's node_modules. This helps prevend bundling package multiple time if package is imported from dependencies. See [rollup-plugin-node-resolve](https://github.com/rollup/rollup-plugin-node-resolve#usage). This is useful when developing a dependency locally, and prevent rollup to duplicate dependencies included both in local and remote packages. 

```js
  "dependencies": { "htm": "^1.0.0", "preact": "^8.0.0", /* ... */ },
  "snowpack": {
    "webDependencies": [
      "htm",
      "preact",
      "preact/hooks", // A package within a package
      "unistore/full/preact.es.js", // An ESM file within a package (supports globs)
      "bulma/css/bulma.css" // A non-JS static asset (supports globs)
    ],
    "dedupe": [
        "lit-element",
        "lit-html" 
    ]
  },
```


