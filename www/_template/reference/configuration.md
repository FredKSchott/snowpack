---
layout: layouts/content.njk
title: snowpack.config.js
description: The Snowpack configuration API reference.
---
```js
// Example: snowpack.config.js
module.exports = {
  plugins: [
    /* ... */
  ],
};
```

```js
// Example: snowpack.config.js (ESM)
// This is ESM-format config file. to enable
// Add "type": "module" in your package.json
export default {
  plugins: [
    /* ... */
  ],
};
```

> To generate a basic configuration file scaffold in your Snowpack project run `snowpack init`.

## config.root
`string`
Default: `/`

Specify the root of a project using Snowpack.

Previously config.cwd

## config.install
`string[]`

Known dependencies to install with Snowpack. 

> Used for installing packages any dependencies that couldn't be detected by our automatic import scanner (ex: package CSS files).

## config.extends
`string`

Inherit from a separate "base" config.

> Can be a relative file path, an npm package, or a file within an npm package. Your configuration will be merged on top of the extended base config.

## config.exclude
`string[]`
Default: `['**/node_modules/**/*', '**/web_modules/**/*', '**/.types/**/*']`

Exclude any files from the Snowpack pipeline.

Supports glob pattern matching.

## config.knownEntrypoints
`string[]`

TODO: I think it's similar to plugin.knownEntrypoints
  
## config.mount
```
mount: {
  [path: string]: string | {url: string, resolve: boolean, static: boolean, staticHtml: boolean}
}
```

Mount local directories to custom URLs in your built application.

application.

```js
// snowpack.config.js
// Example: Basic "mount" usage
{
  "mount": {
    "src": "/dist",
    "public": "/"
  }
}
```

You can further customize this the build behavior for any mounted directory by using the expanded object notation:

 <!-- snowpack/src/config.ts -->

```js
// snowpack.config.js
// Example: expanded object notation "mount" usage
{
  "mount": {
    // Same behavior as the "src" example above:
    "src": {url: "/dist"},
    // Mount "public" to the root URL path ("/*") and serve files with zero transformations:
    "public": {url: "/", static: true, resolve: false}
  }
}
```

- `mount.url` | `string` | _required_ : The URL to mount to, matching the string in the simple form above.
- `mount.static` | `boolean` | _optional_ | Default: `false` : If true, don't build files in this directory. Copy and serve them directly from disk to the browser.
 <!-- TODO: does this still exist?
- `staticHtml` _optional, default: false_: If true, don't build HTML (`.html`) files in this directory. This special option exists because HTML files are almost always built to support HMR and the popular pattern of keeping HTML files in a `public/` directory that's otherwise full of static. -->
- `mount.resolve` | `boolean` | _optional_ | default: `true`: If false, don't resolve JS & CSS imports in your JS, CSS, and HTML files. Instead send every import to the browser, as written.
- 
## config.alias
`object` (package: package or path)

Configure import aliases for directories and packages. 

> Note: In an older version of Snowpack, all mounted directories were also available as aliases by default. As of Snowpack 2.7, this is no longer the case and no aliases are defined by default.

```js
// snowpack.config.js
// Example: alias types
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

## config.plugins
`array` containing pluginName `string` or an array [`pluginName`, {`pluginOptions`}

Enable Snowpack plugins and their options

```js
// snowpack-config.js
// Example: enable plugins both simple and expanded
{
  plugins: ['plugin-1', ['plugin-2', { 'plugin-option': false }]];
}
```

## config.devOptions
`object` (option name: value)

Configure the Snowpack dev server.

### devOptions.secure
`boolean`

- Toggles whether or not Snowpack dev server should use HTTPS with HTTP2 enabled.

### devOptions.hostname
`string`
Default: `localhost`

- The hostname where the browser tab will be open.

### devOptions.port 
`number`
Default: `8080`

- The port number to run the dev server on.

### devOptions.fallback
`string` 
Default: `"index.html"`

- When using the Single-Page Application (SPA) pattern, this is the HTML "shell" file that gets served for every (non-resource) user route. Make sure that you configure your production servers to serve this as well.

### devOptions.open 
`string`
Default: `"default"`

- Opens the dev server in a new browser tab. If Chrome is available on macOS, an attempt will be made to reuse an existing browser tab. Any installed browser may also be specified. E.g., "chrome", "firefox", "brave". Set "none" to disable.

### devOptions.output 
`"stream" | "dashboard"`
Default: `"dashboard"`

- Set the output mode of the `dev` console.
- `"dashboard"` delivers an organized layout of console output and the logs of any connected tools. This is recommended for most users and results in the best logging experience.
- `"stream"` is useful when Snowpack is run in parallel with other commands, where clearing the shell would clear important output of other commands running in the same shell.

### devOptions.hmr
`boolean`
Default: `true`

- Toggles whether or not Snowpack dev server should have HMR enabled.

### devOptions.hmrDelay

### devoptions.hmrPort

### devOptions.hmrErrorOverlay
`boolean`
Default: `true`

- When HMR is enabled, toggles whether or not a browser overlay should display javascript errors.

### devOptions.out
`string` 
Default: `"build"`

> _NOTE:_ Deprecated, see `buildOptions.out`.

## config.installOptions
`todo`

TODO: Had to pull from config.ts because these are in types.ts

TODO: copy editing

Configure how npm packages are installed. Settings that determine how Snowpack handles installing modules.See the section below for all options.

### installOptions.dest 
`string`
Default:`”web_modules”`

- Configure the install directory.

### installOptions.externalPackage 
`string[]`

- _NOTE: This is an advanced feature, and may not do what you want! Bare imports are not supported in any major browser, so an ignored import will usually fail when sent directly to the browser._
- Mark some imports as external. Snowpack won't install them and will ignore them when resolving imports.
- Example: `"externalPackage": ["fs"]`

### installOptions.treeshake 
`boolean`
Default:`false`, or `true` when run with `snowpack build`

- Treeshake your dependencies to optimize your installed files. Snowpack will scan your application to detect which exact imports are used from each package, and then will remove any unused imports from the final install via dead-code elimination (aka tree shaking).

### installOptions.installTypes 
`boolean`

- Install TypeScript type declarations with your packages. Requires changes to your [tsconfig.json](#typescript) to pick up these types.

### installOptions.polyfillNode
`boolean`

If you depend on packages that depend on Node.js built-in modules (`"fs"`, `"path"`, `"url"`, etc.) you can run Snowpack with `--polyfill-node` (or `installOptions.polyfillNode: true` in your config file). This will automatically polyfill any Node.js dependencies as much as possible for the browser. You can see the full list of supported polyfills here: https://github.com/ionic-team/rollup-plugin-node-polyfills

If you'd like to customize this polyfill behavior, skip the `--polyfill-node` flag and instead provide your own Rollup plugin for the installer:

```js
// Example: If `--polyfill-node` doesn't support your use-case, you can provide your own custom Node.js polyfill behavior
module.exports = {
  installOptions: {
    polyfillNode: false,
    rollup: {
      plugins: [require('rollup-plugin-node-polyfills')({crypto: true, ...})],
    },
  },
};
```

### installOptions.sourceMap 
`boolean`

- Emit source maps for installed packages.

### installOptions.env 
`{[ENV_NAME: string]: (string true)}`

- Sets a `process.env.` environment variable inside the installed dependencies. If set to true (ex: `{NODE_ENV: true}` or `--env NODE_ENV`) this will inherit from your current shell environment variable. Otherwise, set to a string (ex: `{NODE_ENV: 'production'}` or `--env NODE_ENV=production`) to set the exact value manually.


### installOptions.rollup 
`Object`

- Snowpack uses Rollup internally to install your packages. This `rollup` config option gives you deeper control over the internal rollup configuration that we use.

- **installOptions.rollup.plugins** - Specify [Custom Rollup plugins](/reference/common-error-details#installing-non-js-packages) if you are dealing with non-standard files.
- **installOptions.rollup.dedupe** - If needed, deduplicate multiple versions/copies of a packages to a single one. This helps prevent issues with some packages when multiple versions are installed from your node_modules tree. See [rollup-plugin-node-resolve](https://github.com/rollup/plugins/tree/main/packages/node-resolve#usage) for more documentation.
- **installOptions.rollup.context** - Specify top-level `this` value. Useful to silence install errors caused by legacy common.js packages that reference a top-level this variable, which does not exist in a pure ESM environment. Note that the `'THIS_IS_UNDEFINED'` warning ("'this' keyword is equivalent to 'undefined' ... and has been rewritten") is silenced by default, unless `--verbose` is used.

### installOptions.namedExports 
`string[]`

TODO I don’t see in types.ts or config.ts

- _NOTE(v2.13.0): Snowpack now automatically supports named exports for most Common.js packages. This configuration remains for any package that Snowpack can't handle automatically. In most cases, this should no longer be needed._
- Import CJS packages using named exports (Example: `import {useTable} from 'react-table'`).
- Example: `"namedExports": ["react-table"]`

### installOptions.packageLookupFields 
`string[]`

TODO I don’t see in types.ts or config.ts

- Set custom lookup fields for dependency `package.json` file entrypoints, in addition to the defaults like "module", "main", etc. Useful for package ecosystems like Svelte where dependencies aren't shipped as traditional JavaScript.
- Example: `"packageLookupFields": ["svelte"]`

## config.buildOptions
`todo`
Default: TODO

Configure your build. See the section below for all options.

### buildOptions.out
`string`
Default: `"build"`

- The local directory that we output your final build to.

### buildOptions.baseUrl
`string`
Default: `/`

- In your HTML, replace all instances of `%PUBLIC_URL%` with this (inspired by the same [Create React App](https://create-react-app.dev/docs/using-the-public-folder/) concept). This is useful if your app will be deployed to a subdirectory. _Note: if you have `homepage` in your `package.json`, Snowpack will actually pick up on that, too._

### buildOptions.clean
`boolean`
Default: `true`

- Set to `false` to prevent Snowpack from deleting the build output folder (`buildOptions.out`) between builds.

### buildOptions.metaDir
`string`
Default: `__snowpack__`

- By default, Snowpack outputs Snowpack-related metadata such as [HMR](/concepts/hot-module-replacement) and [ENV](/reference/configuration#environment-variables) info to a folder called `__snowpack__`. You can rename that folder with this option (e.g.: `metaDir: 'static/snowpack'`).

### buildOptions.sourceMaps
`boolean`
Default: `false`

- **_Experimental:_** Set to `true` to enable source maps

### buildOptions.webModulesUrl
`string`
Default: `web_modules`

- Rename your web modules directory.

### buildOptions.jsxFactory
`string`
Default: `React.createElement` (or `h` if Preact import is detected)

- Set the name of the used function to create JSX elements.

### buildOptions.jsxFragment
`string`
Default: `React.Fragment` (or `Fragment` if Preact import is detected)

- Set the name of the used function to create JSX fragments.

## config.testOptions
 
 Configure your tests. See the section below for all options.
 
### testOptions.files
`string[]`
Default: `["__tests__/**/*", "**/*.@(spec|test).*"]`

- The location of all test files.
- All matching test files are scanned for installable dependencies during development, but excluded from both scanning and building in your final build.
 
 
## config.experiments

`object` (option name: value)

This section is experimental and not yet finalized. May change across versions.

[See the code for options](https://github.com/snowpackjs/snowpack/blob/main/snowpack/src/types/snowpack.ts#L235)

## config.\_extensionMap

TODO: I think this matches input extentions to output but I am not sure



## config.proxy
TODO: I no longer see this in the types.ts file is it deprecated?
`todo`
Default: TODO

Configure the dev server to proxy requests. See the section below for all options.

If desired, `"proxy"` is where you configure the proxy behavior of your dev server. Define different paths that should be proxied, and where they should be proxied to.

The short form of a full URL string is enough for general use. For advanced configuration, you can use the object format to set all options supported by [http-proxy](https://github.com/http-party/node-http-proxy).

This configuration has no effect on the final build.

Example:

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

Options:

- **`"path".on`** | `object` (string: function)
  - `on` is a special Snowpack property for setting event handler functions on proxy server events. See the section on ["Listening for Proxy Events"](https://github.com/http-party/node-http-proxy#listening-for-proxy-events) for a list of all supported events. You must be using a `snowpack.config.js` JavaScript configuration file to set this.
- All options supported by [http-proxy](https://github.com/http-party/node-http-proxy).

## Environment Variables
TODO: Figure out where this goes

```js
// `import.meta.env` - Read process.env variables in your web app
fetch(`${import.meta.env.SNOWPACK_PUBLIC_API_URL}/users`).then(...)

// Supports destructuring as well:
const {SNOWPACK_PUBLIC_API_URL} = import.meta.env;
fetch(`${SNOWPACK_PUBLIC_API_URL}/users`).then(...)

// Instead of `import.meta.env.NODE_ENV` use `import.meta.env.MODE`
if (import.meta.env.MODE === 'development') {
  // ...
```

You can read environment variables directly in your web application via `import.meta.env`. If you've ever used `process.env` in Create React App or any Webpack application, this behaves exactly the same.

For your safety, Snowpack supports only environment variables which begin with `SNOWPACK_PUBLIC_*`. We do this because everything in your web application is sent to the browser, and we don't want you to accidentally share sensitive keys/env variables with your public web application. Prefixing your frontend web env variables with `SNOWPACK_PUBLIC_` is a good reminder that they will be shared with the world.

`import.meta.env.MODE` and `import.meta.env.NODE_ENV` are also both set to the current `process.env.NODE_ENV` value, so that you can change app behavior based on dev vs. build. The env value is set to `development` during `snowpack dev` and `production` during `snowpack build`. Use this in your application instead of `process.env.NODE_ENV`.

You can also use environment variables in HTML files. All occurrences of `%SNOWPACK_PUBLIC_*%`, `%PUBLIC_URL%`, and `%MODE%` will be replaced at build time.

**Remember:** that these env variables are statically injected into your application for everyone at **build time**, and not runtime.

```

```

