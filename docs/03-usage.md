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

Note that having this config will disable the zero-config mode that attempts to install every package found in your package.json "dependencies". Either use this together with the `--include` flag, or just make sure that you whitelist everything that you want installed.

### All CLI Options

Add any flags to the `snowpack` CLI command:

| Key                 | Type       | Default                                            | Description                                                                                                                                                                                 |
| ------------------- | ---------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--dest`            | `string`   | `web_modules`                                      | Specify destination directory.                                                                                                                                                              |
| `--clean`           | `boolean`  | `false`                                            | Clean out the `dest` directory before running.                                                                                                                                              |
| `--optimize`        | `boolean`  | `false`                                            | Transpile, minify, and optimize installed dependencies for production (this may slow down snowpack!).                                                                                       |
| `--babel`           | `boolean`  | `false`                                            | Transpile installed dependencies. Automatically enabled with `--optimize`.                                                                                                                  |
| `--include`         | `string`   |                                                    | Auto-detect imports from file(s). Supports glob.                                                                                                                                            |
| `--exclude`         | `string`   | `'**/__tests__/*' '**/*.@(spec\|test).@(js\|mjs)'` | Exclude files from `--include`. Follows glob’s ignore pattern.                                                                                                                              |
| `--strict`          | `boolean`  | `false`                                            | Only install pure ESM dependency trees. Fail if a CJS module is encountered.                                                                                                                |
| `--no-source-map`   | `boolean`  | `false`                                            | Skip emitting source map files (`.js.map`) into `dest`.                                                                                                                                     |
| `--remote-package`  | `string[]` |                                                    | `name,version` pair(s) of packages that should be left unbundled and referenced remotely. Example: `foo,v4` will rewrite all imports of `foo` to `{remoteUrl}/foo/v4` (see `--remote-url`). |
| `--remote-url`      | `string`   | `https://cdn.pika.dev`                             | Configures the domain where remote imports point to.                                                                                                                                        |
| `--nomodule`        | `string`   |                                                    | Your app’s entry file for generating a `<script nomodule>` bundle                                                                                                                           |
| `--nomodule-output` | `string`   | `app.nomodule.js`                                  | Filename for nomodule output                                                                                                                                                                |

You can see a list of all these options with the `--help` flag without having to refer back to these docs:

```bash
npx snowpack --help
```

### Configuration

All CLI flags can optionally be specified in a configuration file, along with additional options.

#### Default config

Snowpack can be configured within `package.json` under the `snowpack` namespace:

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
    "options": {
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

#### Using snowpack.config.js

Alternately, you may configure Snowpack with a `snowpack.config.js` file in the same directory as `package.json`. You may prefer this option if you want to generate parts of your configuration with Node.js, or if you’d simply like to keep your `package.json` cleaner.

```js
module.exports = {
  webDependencies: [...myWebDependenciesGeneratorFunction()],
  options: {
    optimize: process.env.NODE_ENV === "production"
  }
};
```

#### All Options

| Key               | Type       | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------- | ---------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `webDependencies` | `string[]` | `[]`    | (Recommended) Set exactly which packages to install with Snowpack. Without this, Snowpack will just try to install every package in your "dependencies" config. That behavior is great for getting started but it won't warn you if an expected package fails to install.                                                                                                                                                              |
| `options.*`       | `object`   | `{}`    | CLI options (camelcased, so `source-map` becomes `"sourceMap"`). If any settings here conflict with a CLI flag, the CLI flag takes priority.                                                                                                                                                                                                                                                                                           |  |
| `namedExports`    | `object`   |         | (Optional) If needed, you can explicitly define named exports for any dependency. You should only use this if you're getting `"'X' is not exported by Y"` errors without it. See [rollup-plugin-commonjs](https://github.com/rollup/rollup-plugin-commonjs#usage) for more info.                                                                                                                                                       |
| `dedupe`          | `string[]` | `[]`    | (Optional) If needed, force resolving for these modules to root's node_modules. This helps prevent bundling package multiple time if package is imported from dependencies. See [rollup-plugin-node-resolve](https://github.com/rollup/plugins/tree/master/packages/node-resolve#usage). This is useful when developing a dependency locally, and prevent rollup to duplicate dependencies included both in local and remote packages. |
