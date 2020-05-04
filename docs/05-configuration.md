## Configuration

Snowpack's behavior can be configured by CLI flags, a custom Snowpack config file, or both. [See the table below for the full list of supported options](#configuration-options).

### Config Files

Snowpack supports configuration files in multiple formats, sorted by priority order:

1. `--config [path]`: If provided.
1. `package.json`: A namespaced config object (`"snowpack": {...}`).
1. `snowpack.config.js`: (`module.exports = {...}`).
1. `snowpack.config.json`: (`{...}`).

### CLI Flags

``` bash
$ snowpack --help
```

CLI flags will be merged with (and take priority over) your config file values. Every config value outlined below can also be passed as a CLI flag. Additionally, Snowpack also supports the following flags:

- **`--help`** Show this help.
- **`--version`** Show the current version. 
- **`--reload`** Clear the local CDN cache. Useful when troubleshooting installer issues.


### All Config Options

```js
{
  "include": "src/",
  "knownEntrypoints": [
    "htm",
    "preact",
    "preact/hooks", // A package within a package
    "unistore/full/preact.es.js", // An ESM file within a package (supports globs)
    "bulma/css/bulma.css" // A non-JS static asset (supports globs)
  ],
  "installOptions": { /* ... */ },
  "buildOptions": { /* ..... */ }
}
```

#### Top-Level Options

- **`extends`** | `string`
  - Inherit from a separate "base" config. Can be a relative file path, an npm package, or a file within an npm package. Your configuration will be merged on top of the extended base config.
- **`include`** | `string`
  - Your source directory, if one exists. Defaults to `"src/"` if a local `src/` directory exists in your project. 
  - **This is a special directory for Snowpack.** Snowpack will scan for package imports and run custom build "scripts" on these source files. All `src/*` files will be re-written to `/_dist_/*` in the final build (see  `buildOptions.dist` option below for more info).
- **`exclude`** | `string[]`
  - Exclude any files from the `--include` directory. Defaults to exclude common test file locations: `['**/__tests__/*', '**/*.@(spec|test).@(js|mjs)']`
  - Useful for excluding tests and other unnecessary files from the final build. Supports glob pattern matching. 
- **`knownEntrypoints`** | `string[]`
  - Known dependencies to install with Snowpack. Useful for installing packages manually and any dependencies that couldn't be detected by our automatic import scanner (ex: package CSS files).
- **`scripts`**
  - Set build scripts to transform your source files. See the section below for more info.
- **`installOptions.*`**
  - Configure how npm packages are installed. See the section below for all options.
- **`buildOptions.*`**
  - Configure your dev server and build workflows. See the section below for all options.

#### Install Options

- **`dest`** | `string`
  - *Default:`"web_modules"`*
  - Configure the install directory.
- **`clean`** | `boolean`
  - *Default:`true`*
  - Delete the existing `dest` directory (any any outdated files) before installing.
- **`sourceMap`** | `boolean`  
  - Emit source maps for installed packages.
- **`env`** | `{[ENV_NAME: string]: (string | true)}`
  - Sets a `process.env.` environment variable inside the installed dependencies. If set to true (ex: `{NODE_ENV: true}` or `--env NODE_ENV`) this will inherit from your current shell environment variable. Otherwise, set to a string (ex: `{NODE_ENV: 'production'}` or `--env NODE_ENV=production`) to set the exact value manually.
- **`installTypes`** | `boolean`
  - Install TypeScript type declarations with your packages. Requires changes to your [tsconfig.json](#TypeScript) to pick up these types. 
- **`alias`** | `{[mapFromPackageName: string]: string}`
  - Alias an installed package name. This applies to imports within your application and within your installed dependency graph. 
  - Example: `"alias": {"react": "preact/compat", "react-dom": "preact/compat"}`
- **`rollup`**
  - Snowpack uses Rollup internally to install your packages. This `rollup` config option gives you deeper control over the internal rollup configuration that we use. 
  - **`rollup.plugins`** - Specify [Custom Rollup plugins](#custom-rollup-plugins) if you are dealing with non-standard files.
  - **`rollup.dedupe`** - If needed, deduplicate multiple versions/copies of a packages to a single one. This helps prevent issues with some packages when multiple versions are installed from your node_modules tree. See [rollup-plugin-node-resolve](https://github.com/rollup/plugins/tree/master/packages/node-resolve#usage) for more documentation.
  - **`rollup.namedExports`** - If needed, you can explicitly define named exports for any dependency. You should only use this if you're getting `"'X' is not exported by Y"` errors without it. See [rollup-plugin-commonjs](https://github.com/rollup/rollup-plugin-commonjs#usage) for more documentation.

#### Build Options

- **`port`** | `number` | Default: `3000`
  - The port number to run the dev server on.
- **`out`** | `string` | Default: `"build"`
  - The local directory that we output your final build to.
- **`dist`** | `string` | Default: `"/_dist_"`
  - The final URL path location for your "include" (`src/`) directory.
  - When Snowpack builds your application (or serves it during development) Snowpack will rewrite all `src/*` files to be hosted at the `/_dist_/*` URL path.
- **`fallback`** | `string` | Default: `"index.html"`
  - When using the Single-Page Application (SPA) pattern, this is the HTML "shell" file that gets served for every (non-resource) user route. Make sure that you configure your production servers to serve this as well.
- **`bundle`** | `string` | Default: `false`
  - Bundle the build output. Useful for production builds when performance is important.

