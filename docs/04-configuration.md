

## Configuration

Snowpack's behavior can be configured by CLI flags, a custom Snowpack config file, or both. [See the table below for the full list of supported options](#configuration-options).

### CLI Flags

```
$ npx snowpack --optimize --clean
```

CLI flags will always be merged with (and take priority over) a config file.

### Config Files

Snowpack supports configuration files in multiple formats. Snowpack will look for configuration in the current working directory in this order:

1. `package.json`: A namespaced config object (`"snowpack": {...}`).
2. `snowpack.config.js`: A JS file exporting a config object (`module.exports = {...}`).
3. `snowpack.config.json`: A JSON file containing config (`{...}`).


### Configuration Options

```js
{
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
  "dedupe": ["lit-element", "lit-html"],
  "rollup": {
    "plugins": []
  }
}
```

| Config Option      | Type       | Description                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `webDependencies`  | `string[]` | (Recommended) Set exactly which packages to install with Snowpack.                                                                                                                                                                                                                                                                |
| `source`           | `string`   | Configure where packages are installed from. See [Skipping NPM Install](#skipping-npm-install) for more info. Supported: `pika`, `local` (default).                                                                                                                                                                                |
| `installOptions.*` | `object`   | Configure how packages are installed. See table below for all options.                                                                                                                                                                                                                                                            |
| `namedExports`     | `object`   | If needed, you can explicitly define named exports for any dependency. You should only use this if you're getting `"'X' is not exported by Y"` errors without it. See [rollup-plugin-commonjs](https://github.com/rollup/rollup-plugin-commonjs#usage) for more documentation.                                                    |
| `dedupe`           | `string[]` | If needed, deduplicate multiple versions/copies of a packages to a single one. This helps prevent issues with some packages when multiple versions are installed from your node_modules tree. See [rollup-plugin-node-resolve](https://github.com/rollup/plugins/tree/master/packages/node-resolve#usage) for more documentation. |
| `rollup.plugins`   | `object[]` | Specify [Custom Rollup plugins](#custom-rollup-plugins) if you are dealing with non-standard files.                                                                                                                                                                                                                               |

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
| `--hash`             | `hash`            | `boolean`  | `false`           | Add a `?rev=XXX` hash to each import in the import map / used by Babel plugin. May cause double-requests, if one top-level package imports another.                                                    |
| `--source-map`       | `sourceMap`       | `boolean`  | See Description.  | Emit source maps. Enabled automatically by `--optimize`. Can be disabled via CLI flag via `--no-source-map`.                                                                                           |
| `--nomodule`         | `nomodule`        | `string`   |                   | Enable a `<script nomodule>` bundle. Value should be the entrypoint of your application to start bundling from. See our [Supporting Legacy Browsers](#supporting-legacy-browsers) guide for more info. |
| `--nomodule-output`  | `nomoduleOutput`  | `string`   | `app.nomodule.js` | File name/path for the nomodule output.                                                                                                                                                                |
| `--external-package` | `externalPackage` | `string[]` | `[]`              | (Advanced use only) Mark these packages as external to be left unbundled and referenced remotely. Example: `--external-package foo` will leave in all imports of `foo`.                                |

You can also use the `--help` flag to see a list of these options on the command line.

