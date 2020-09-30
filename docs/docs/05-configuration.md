## Configuration

TODO: This section should describe configuration, all API reference should go to reference section

Snowpack's behavior can be configured by CLI flags, a custom Snowpack config file, or both. [See the table below for the full list of supported options](#all-config-options).

### Config Files

Snowpack supports configuration files in multiple formats, sorted by priority order:

1. `--config [path]`: If provided.
1. `package.json`: A namespaced config object (`"snowpack": {...}`).
1. `snowpack.config.cjs`: (`module.exports = {...}`) for projects using `"type": "module"`.
1. `snowpack.config.js`: (`module.exports = {...}`).
1. `snowpack.config.json`: (`{...}`).

### CLI Flags

```bash
# Show helpful info
$ snowpack --help

# Show additional debugging logs
$ snowpack --verbose

# {installOptions: {dest: 'CUSTOM_DIR/'}}
$ snowpack install --dest CUSTOM_DIR/

# {devOptions: {bundle: true}}
$ snowpack dev --bundle

# {devOptions: {bundle: false}}
$ snowpack dev --no-bundle

# {buildOptions: {clean: true}}
$ snowpack build --clean
```

**CLI flags will be merged with (and take priority over) your config file values.** Every config value outlined below can also be passed as a CLI flag. Additionally, Snowpack also supports the following flags:

- **`--config [path]`** Set the path to your project config file.
- **`--help`** Show this help.
- **`--version`** Show the current version.
- **`--reload`** Clear the local cache. Useful for troubleshooting installer issues.

#### Dev Options

- **`devOptions.port`** | `number` | Default: `8080`
  - The port number to run the dev server on.
- **`devOptions.out`** | `string` | Default: `"build"`
  - The local directory that we output your final build to.
- **`devOptions.bundle`** | `boolean`
  - Create an optimized, bundled build for production.
  - You must have [Parcel](https://parceljs.org/) as a dev dependency in your project.
  - If undefined, this option will be enabled if the `parcel` package is found.
- **`devOptions.fallback`** | `string` | Default: `"index.html"`
  - When using the Single-Page Application (SPA) pattern, this is the HTML "shell" file that gets served for every (non-resource) user route. Make sure that you configure your production servers to serve this as well.
- **`devOptions.open`** | `string` | Default: `"default"`
  - Opens the dev server in a new browser tab. If Chrome is available on macOS, an attempt will be made to reuse an existing browser tab. Any installed browser may also be specified. E.g., "chrome", "firefox", "brave". Set "none" to disable.
- **`devOptions.hostname`** | `string` | Default: `localhost`
  - The hostname where the browser tab will be open.
- **`devOptions.hmr`** | `boolean` | Default: `true`
  - Toggles whether or not Snowpack dev server should have HMR enabled.
- **`devOptions.secure`** | `boolean`
  - Toggles whether or not Snowpack dev server should use HTTPS with HTTP2 enabled.

#### Build Options

- **`buildOptions.baseUrl`** | `string` | Default: `/`
  - In your HTML, replace all instances of `%PUBLIC_URL%` with this (inspired by the same [Create React App](https://create-react-app.dev/docs/using-the-public-folder/) concept). This is useful if your app will be deployed to a subdirectory. _Note: if you have `homepage` in your `package.json`, Snowpack will actually pick up on that, too._
- **`buildOptions.clean`** | `boolean` | Default: `false`
  - Set to `true` if Snowpack should erase the build folder before each build.
- **`buildOptions.metaDir`** | `string` | Default: `__snowpack__`
  - By default, Snowpack outputs Snowpack-related metadata such as [HMR](#hot-module-replacement) and [ENV](#environment-variables) info to a folder called `__snowpack__`. You can rename that folder with this option (e.g.: `metaDir: 'static/snowpack'`).
- **`buildOptions.sourceMaps`** | `boolean` | Default: `false`
  - **_Experimental:_** Set to `true` to enable source maps
- **`buildOptions.webModulesUrl`** | `string` | Default: `web_modules`
  - Rename your web modules directory.

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
    // Files in the local "src/" directory are written to `/_dist_/*` in the final build.
    "src": "/_dist_",
    // Files in the local "public/" directory are written to `/*` in the final build.
    "public": "/"
    // … add other folders here
  }
}
```

The `mount` configuration lets you map local files to their location in the final build. If no mount configuration is given, then the entire current working directory (minus excluded files) will be built and mounted to the Root URL (Default: `/`, respects `baseUrl`).

#### Alias Options

> Note: In an older version of Snowpack, all mounted directories were also available as aliases by default. As of Snowpack 2.7, this is no longer the case and no aliases are defined by default.

```js
// snowpack.config.json
{
  alias: {
    // Type 1: Package Import Alias
    "lodash": "lodash-es",
    "react": "preact/compat",
    // Type 2: Local Directory Import Alias (relative to cwd)
    "components": "./src/components"
    "@app": "./src"
  }
}
```

The `alias` config option lets you define an import alias in your application. When aliasing a package, this allows you to import that package by another name in your application. This applies to imports inside of your dependencies as well, essentially replacing all references to the aliased package.

Aliasing a local directory (any path that starts with "./") creates a shortcut to import that file or directory. While we don't necessarily recommend this pattern, some projects do enjoy using these instead of relative paths:

```diff
-import '../../../../../Button.js';
+import '@app/Button.js';
```
