## Configuration

Snowpack's behavior can be configured by CLI flags, a custom Snowpack config file, or both. [See the table below for the full list of supported options](#configuration-options).

### Config Files

Snowpack supports configuration files in multiple formats, sorted by priority order:

1. `--config [path]`: If provided.
1. `package.json`: A namespaced config object (`"snowpack": {...}`).
1. `snowpack.config.js`: (`module.exports = {...}`).
1. `snowpack.config.json`: (`{...}`).

### CLI Flags

```bash
# Show helpful info
$ snowpack --help

# {installOptions: {dest: 'CUSTOM_DIR/'}}
$ snowpack install --dest CUSTOM_DIR/

# {devOptions: {bundle: true}}
$ snowpack dev --bundle

# {devOptions: {bundle: false}}
$ snowpack dev --no-bundle
```

**CLI flags will be merged with (and take priority over) your config file values.** Every config value outlined below can also be passed as a CLI flag. Additionally, Snowpack also supports the following flags:

- **`--config [path]`** Set the path to your project config file.
- **`--help`** Show this help.
- **`--version`** Show the current version.
- **`--reload`** Clear the local cache. Useful for troubleshooting installer issues.


### All Config Options

```js
{
  "install": [
    "htm",
    "preact",
    "preact/hooks", // A package within a package
    "unistore/full/preact.es.js", // An ESM file within a package (supports globs)
    "bulma/css/bulma.css" // A non-JS static asset (supports globs)
  ],
  "mount": { /* ... */ },
  "proxy": { /* ... */ },
  "plugins": [ /* ... */ ],
  "installOptions": { /* ... */ },
  "devOptions": { /* ... */ },
  "buildOptions": { /* ... */ },
}
```

#### Top-Level Options

- **`extends`** | `string`
  - Inherit from a separate "base" config. Can be a relative file path, an npm package, or a file within an npm package. Your configuration will be merged on top of the extended base config.
- **`exclude`** | `string[]`
  - Exclude any files from scanning, building, etc. Defaults to exclude common test file locations: `['**/node_modules/**/*', '**/__tests__/*', '**/*.@(spec|test).@(js|mjs)']`
  - Useful for excluding tests and other unnecessary files from the final build. Supports glob pattern matching.
- **`install`** | `string[]`
  - Known dependencies to install with Snowpack. Useful for installing packages manually and any dependencies that couldn't be detected by our automatic import scanner (ex: package CSS files).
- **`mount.*`**
  - Mount local directories to custom URLs in your built application.
- **`alias.*`**
  - Configure import aliases for directories and packages. See the section below for all options.
- **`proxy.*`**
  - Configure the dev server to proxy requests. See the section below for all options.
- **`plugins`**
  - Extend Snowpack with 3rd party tools and plugins. See the section below for more info.
- **`installOptions.*`**
  - Configure how npm packages are installed. See the section below for all options.
- **`devOptions.*`**
  - Configure your dev server. See the section below for all options.
- **`buildOptions.*`**
  - Configure your build. See the section below for all options.

#### Install Options

- **`dest`** | `string`
  - *Default:`"web_modules"`*
  - Configure the install directory.
- **`sourceMap`** | `boolean`
  - Emit source maps for installed packages.
- **`env`** | `{[ENV_NAME: string]: (string | true)}`
  - Sets a `process.env.` environment variable inside the installed dependencies. If set to true (ex: `{NODE_ENV: true}` or `--env NODE_ENV`) this will inherit from your current shell environment variable. Otherwise, set to a string (ex: `{NODE_ENV: 'production'}` or `--env NODE_ENV=production`) to set the exact value manually.
- **`treeshake`** | `boolean`
  - *Default:`false`, or `true` when run with `snowpack build`*
  - Treeshake your dependencies to optimize your installed files. Snowpack will scan your application to detect which exact imports are used from each package, and then will remove any unused imports from the final install via dead-code elimination (aka tree shaking).
- **`installTypes`** | `boolean`
  - Install TypeScript type declarations with your packages. Requires changes to your [tsconfig.json](#TypeScript) to pick up these types.
- **`alias`** | `{[mapFromPackageName: string]: string}`
  - Alias an installed package name. This applies to imports within your application and within your installed dependency graph.
  - Example: `"alias": {"react": "preact/compat", "react-dom": "preact/compat"}`
- **`namedExports`** | `string[]`
  - Legacy Common.js (CJS) packages should only be imported by the default import (Example: `import reactTable from 'react-table'`)
  - But, some packages use named exports in their documentation, which can cause confusion for users. (Example: `import {useTable} from 'react-table'`)
  - You can enable "fake/synthetic" named exports for Common.js package by adding the package name under this configuration.
  - Example: `"namedExports": ["react-table"]`
- **`rollup`**
  - Snowpack uses Rollup internally to install your packages. This `rollup` config option gives you deeper control over the internal rollup configuration that we use.
  - **`rollup.plugins`** - Specify [Custom Rollup plugins](#installing-non-js-packages) if you are dealing with non-standard files.
  - **`rollup.dedupe`** - If needed, deduplicate multiple versions/copies of a packages to a single one. This helps prevent issues with some packages when multiple versions are installed from your node_modules tree. See [rollup-plugin-node-resolve](https://github.com/rollup/plugins/tree/master/packages/node-resolve#usage) for more documentation.

#### Dev Options

- **`port`** | `number` | Default: `8080`
  - The port number to run the dev server on.
- **`out`** | `string` | Default: `"build"`
  - The local directory that we output your final build to.
- **`bundle`** | `boolean`
  - Create an optimized, bundled build for production.
  - You must have [Parcel](https://parceljs.org/) as a dev dependency in your project.
  - If undefined, this option will be enabled if the `parcel` package is found.
- **`fallback`** | `string` | Default: `"index.html"`
  - When using the Single-Page Application (SPA) pattern, this is the HTML "shell" file that gets served for every (non-resource) user route. Make sure that you configure your production servers to serve this as well.
- **`open`** | `string` | Default: `"default"`
  - Opens the dev server in a new browser tab. If Chrome is available on macOS, an attempt will be made to reuse an existing browser tab. Any installed browser may also be specified. E.g., "chrome", "firefox", "brave". Set "none" to disable.
- **`hostname`** | `string` | Default: `localhost`
  - The hostname where the browser tab will be open.
- **`hmr`** | `boolean` | Default: `true`
  - Toggles whether or not Snowpack dev server should have HMR enabled.
- **`secure`** | `boolean`
  - Toggles whether or not Snowpack dev server should use HTTPS with HTTP2 enabled.

#### Build Options

- **`baseUrl`** | `string` | Default: `/`
  - In your HTML, replace all instances of `%PUBLIC_URL%` with this (inspired by the same [Create React App](https://create-react-app.dev/docs/using-the-public-folder/) concept). This is useful if your app will be deployed to a subdirectory. _Note: if you have `homepage` in your `package.json`, Snowpack will actually pick up on that, too._
- **`clean`** | `boolean` | Default: `false`
  - Set to `true` if Snowpack should erase the build folder before each build.
- **`metaDir`** | `string` | Default: `__snowpack__`
  - By default, Snowpack outputs Snowpack-related metadata such as [HMR](#hot-module-replacement) and [ENV](#environment-variables) info to a folder called `__snowpack__`. You can rename that folder with this option (e.g.: `metaDir: 'static/snowpack'`).
- **`minify`** | `boolean` | Default: `true`
  - By default, Snowpack will minify your dependencies on `snowpack build`. Disable this by setting this config option to `minify: false`.

#### Proxy Options

```js
// snowpack.config.json
{
  "proxy": {
    // Short form:
    "/api/01": "https://pokeapi.co/api/v2/",
    // Long form:
    "/api/02": {
      on: { proxyReq: (p, req, res) => /* Custom event handlers (JS only) */ },
      /* Custom http-proxy options */
    }
  }
}
```

If desired, `"proxy"` is where you configure the proxy behavior of your dev server. Define different paths that should be proxied, and where they should be proxied to.

The short form of a full URL string is enough for general use. For advanced configuration, you can use the object format to set all options supported by [http-proxy](https://github.com/http-party/node-http-proxy).

`on` is a special property for setting event handler functions on proxy server events. See the section on ["Listening for Proxy Events"](https://github.com/http-party/node-http-proxy#listening-for-proxy-events) for a list of all supported events. You must be using a `snowpack.config.js` JavaScript configuration file to set this.

This configuration has no effect on the final build.

#### Mount Options


```js
// snowpack.config.json
{
  "mount": {
    // Files in the local src directory are written to `/_dist_/*` in the final build.
    "src": "/_dist_",
    // Files in the local public directory are written to `/*` in the final build.
    "public": "/"
  }
}
```

The `mount` configuration lets you map local files to their location in the final build. If no mount configuration is given, then the entire current working directory (minus excluded files) will be built and mounted to the Root URL (Default: `/`, respects `baseUrl`).

#### Alias Options


```js
// snowpack.config.json
{
  alias: {
    // Type 1: Package Import Alias
    "lodash": "lodash-es",
    "react": "preact/compat",
    // Type 2: Local Directory Import Alias (relative to cwd)
    "components": "./src/components"
    "@root": "./src"
  }
}
```

The `alias` configuration lets you define an alias in your source code imports to a package or local directory. 

In an older version of Snowpack, all mounted directories were also available as aliases. As of Snowpack 2.7, this is no longer the case and no aliases are defined by default.
