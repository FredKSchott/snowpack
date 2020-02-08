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

```js
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

Note that this config will disable the zero-config mode that attempts to install every package found in your package.json "dependencies". Either use this together with the `--include` flag, or just make sure that you whitelist everything that you want installed.


### Configuring Snowpack

Snowpack's behavior can be configured by CLI flags, a custom config file, or both. CLI flags will always be merged with (and take priority over) a config file.

#### Configuration via `package.json`

Snowpack can be configured within your `package.json` manifest under the `snowpack` namespace:

```json
{
  "dependencies": { "htm": "^1.0.0", "preact": "^8.0.0", /* ... */ },
  "snowpack": {
    "webDependencies": [
      "htm",
      "preact",
      "preact/hooks", // A package within a package
      "unistore/full/preact.es.js", // An ESM file within a package (supports globs)
      "bulma/css/bulma.css" // A non-JS static asset (supports globs)
    ],
    "installOptions": {
      "dest": "web_modules",
      "clean": false,
      "optimize": false,
      "babel": false,
      "include": "src/**/*.{js,jsx,ts,tsx}",
      "exclude": ["**/__tests__/*", "**/*.@(spec\|test).@(js\|mjs)"],
      "strict": false,
      "sourceMap": true,
      "remotePackage": [],
      "remoteUrl": "https://cdn.pika.dev",
      "nomodule": "src/index.js",
      "nomoduleOutput": "app.nomodule.js"
    },
    "dedupe": ["lit-element", "lit-html"]
  }
}
```

#### Configuration via `snowpack.config.json`

Alternately, you may configure Snowpack with a `snowpack.config.json` file in the same directory as `package.json`. You may prefer this option if you’d like to keep your `package.json` tidier. Its structure is identical:

```json
{
  "webDependencies": [
    "preact",
  ],
  "installOptions": {
    "optimize": false
  }
}
```

#### Configuration via `snowpack.config.js`

To generate parts of your configuration with Node.js, you may use a `snowpack.config.js` file instead:

```js
module.exports = {
  webDependencies: [...myWebDependenciesGeneratorFunction()],
  installOptions: {
    optimize: process.env.NODE_ENV === "production",
    strict: true
  }
};
```


### All Configuration Options

#### Top-Level Configuration

| Config Option     | Type       | Description                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `webDependencies` | `string[]` | (Recommended) Set exactly which packages to install with Snowpack. Without this, Snowpack will just try to install every package in your "dependencies" config. That behavior is great for getting started but it won't warn you if an expected package fails to install.                                                                                                                                                              |
| `installOptions.*`| `object`   | (Optional) Configure how packages are installed. See table below for all install options.                                                                                                                                                                                                                                                                                          |  |
| `namedExports`    | `object`   | (Optional) If needed, you can explicitly define named exports for any dependency. You should only use this if you're getting `"'X' is not exported by Y"` errors without it. See [rollup-plugin-commonjs](https://github.com/rollup/rollup-plugin-commonjs#usage) for more info.                                                                                                                                                       |
| `dedupe`          | `string[]` | (Optional) If needed, force resolving for these modules to root's node_modules. This helps prevent bundling package multiple time if package is imported from dependencies. See [rollup-plugin-node-resolve](https://github.com/rollup/plugins/tree/master/packages/node-resolve#usage). This is useful when developing a dependency locally, and prevent rollup to duplicate dependencies included both in local and remote packages. |


#### Install Options (`installOptions.*`)

| CLI Flag             | Config Option     | Type       | Default           | Description                                                                                                                                                                                            |
| -------------------- | ----------------- | ---------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--dest`             | `dest`            | `string`   | `web_modules`     | Configure the install directory.                                                                                                                                                                       |
| `--clean`            | `clean`           | `boolean`  | `false`           | Delete the existing `dest` directory (any any outdated files) before installing.                                                                                                                       |
| `--optimize`         | `optimize`        | `boolean`  | `false`           | Recommended for production: transpile, minify, and optimize installed dependencies (this may slow down snowpack!).                                                                                     |
| `--babel`            | `babel`           | `boolean`  | `false`           | Transpile installed dependencies. Enabled automatically by `--optimize`. Can be disabled via CLI flag via `--no-babel`.                                                                                |
| `--include`          | `include`         | `string`   |                   | Scans source files to auto-detect install targets. Supports glob pattern matching. See our [Automatic Installs](#automatic-installs-(recommended)) guide for more info.                                |
| `--exclude`          | `exclude`         | `string`   | See Description.  | Exclude files from `--include` scanning. Supports glob pattern matching. Defaults to exclude common test file locations: `['**/__tests__/*', '**/*.@(spec|test).@(js|mjs)']`                           |
| `--strict`           | `strict`          | `boolean`  | `false`           | Only install pure ESM dependency trees. Fail if a CJS module is encountered.                                                                                                                           |
| `--stat`             | `stat`            | `boolean`  | `false`           | Logs install statistics after installing, with information on install targets and file sizes. Useful for CI, performance review.                                                                       |
| `--source-map`       | `sourceMap`       | `boolean`  | See Description.  | Emit source maps. Enabled automatically by `--optimize`. Can be disabled via CLI flag via `--no-source-map`.                                                                                           |
| `--nomodule`         | `nomodule`        | `string`   |                   | Enable a `<script nomodule>` bundle. Value should be the entrypoint of your application to start bundling from. See our [Supporting Legacy Browsers](#supporting-legacy-browsers) guide for more info. |
| `--nomodule-output`  | `nomoduleOutput`  | `string`   | `app.nomodule.js` | File name/path for the nomodule output.                                                                                                                                                                |
| `--external-package` | `externalPackage` | `string[]` | `[]`              | (Advanced use only) Mark these packages as external to be left unbundled and referenced remotely. Example: `--external-package foo` will leave in all imports of `foo`.                                |

You can also use the `--help` flag to see a list of these options on the command line.

