## Basic Usage

Snowpack has a single goal: to install web-ready npm packages to `web_modules/` directory. It doesn't touch your source code. What you build with it, which frameworks you use, and how you serve your project locally is entirely up to you. You can use as many or as few tools on top of Snowpack as you'd like.

Still stuck? See our [Quick Start](#quick-start) guide above for help to get started.

### Zero-Config Installs (Default)

```
$ npx snowpack
```

By default, Snowpack will attempt to install all "dependencies" listed in your package.json manifest. If the package defines an ESM "module" entrypoint, then that package is installed into your new `web_modules/` directory.

As long as all of your web dependencies are listed as package.json "dependencies" (with all other dependencies listed under "devDependencies") this zero-config behavior should work well for your project.



### Automatic Installs (Recommended)

```
$ npx snowpack --include "src/**/*.js"
```

With some additional config, Snowpack is also able to automatically detect dependencies by scanning your application for import statements. This is the recommended way to use Snowpack, since it is both faster and more accurate than trying to install every dependency.

To enable automatic import scanning, use the `--include` CLI flag to tell Snowpack which files to scan for. Snowpack will automatically scan every file for imports with `web_modules` in the import path. It will then parse those to find every dependency required by your project.

Remember to re-run Snowpack every time you import an new dependency.


### Whitelisting Dependencies

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

Optionally, you can also whitelist any dependencies by defining them in your "webDependencies" config (see below). You can use this to control exactly what is installed, including non-JS assets or deeper package resources.

Note that having this config will disable the zero-config mode that attempts to install every package found in your package.json "dependencies". Either use this together with the  `--include` flag, or just make sure that you whitelist everything that you want installed.


### All CLI Options

Run Snowpack with the `--help` flag to see a list of all supported options to customize how Snowpack installs your dependencies.

```bash
npx snowpack --help
```


### All Config Options

> *Note: All package.json options are scoped under the `"snowpack"` property.*

* `"webDependencies"`: (Recommended) Set exactly which packages to install with Snowpack. Without this, Snowpack will just try to install every package in your "dependencies" config. That behavior is great for getting started but it won't warn you if an expected package fails to install.
* `"namedExports"`: (Optional) If needed, you can explicitly define named exports for any dependency. You should only use this if you're getting `"'X' is not exported by Y"` errors without it. See [rollup-plugin-commonjs](https://github.com/rollup/rollup-plugin-commonjs#usage) for more info.
* `"dedupe"`: (Optional) If needed, force resolving for these modules to root's node_modules. This helps prevent bundling package multiple time if package is imported from dependencies. See [rollup-plugin-node-resolve](https://github.com/rollup/plugins/tree/master/packages/node-resolve#usage). This is useful when developing a dependency locally, and prevent rollup to duplicate dependencies included both in local and remote packages.

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


