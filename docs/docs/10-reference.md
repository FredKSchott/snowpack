## API Reference

### `config` | `object` (options)

See the configuration section for information on file formats and command line usage.

options:

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
  - Extend Snowpack with third-party tools and plugins. See the section below for more info.
- **`installOptions.*`**
  - Configure how npm packages are installed. See the section below for all options.
- **`devOptions.*`**
  - Configure your dev server. See the section below for all options.
- **`buildOptions.*`**
  - Configure your build. See the section below for all options.

### `config.installOptions`| `object` (options)

options:

- **`installOptions.dest`** | `string`
  - _Default:`"web_modules"`_
  - Configure the install directory.
- **`installOptions.sourceMap`** | `boolean`
  - Emit source maps for installed packages.
- **`installOptions.env`** | `{[ENV_NAME: string]: (string | true)}`
  - Sets a `process.env.` environment variable inside the installed dependencies. If set to true (ex: `{NODE_ENV: true}` or `--env NODE_ENV`) this will inherit from your current shell environment variable. Otherwise, set to a string (ex: `{NODE_ENV: 'production'}` or `--env NODE_ENV=production`) to set the exact value manually.
- **`installOptions.treeshake`** | `boolean`
  - _Default:`false`, or `true` when run with `snowpack build`_
  - Treeshake your dependencies to optimize your installed files. Snowpack will scan your application to detect which exact imports are used from each package, and then will remove any unused imports from the final install via dead-code elimination (aka tree shaking).
- **`installOptions.installTypes`** | `boolean`
  - Install TypeScript type declarations with your packages. Requires changes to your [tsconfig.json](#typescript) to pick up these types.
- **`installOptions.alias`** | `{[mapFromPackageName: string]: string}`
  - Alias an installed package name. This applies to imports within your application and within your installed dependency graph.
  - Example: `"alias": {"react": "preact/compat", "react-dom": "preact/compat"}`
- **`installOptions.namedExports`** | `string[]`
  - Legacy Common.js (CJS) packages should only be imported by the default import (Example: `import reactTable from 'react-table'`)
  - But, some packages use named exports in their documentation, which can cause confusion for users. (Example: `import {useTable} from 'react-table'`)
  - You can enable "fake/synthetic" named exports for Common.js package by adding the package name under this configuration.
  - Example: `"namedExports": ["react-table"]`
- **`installOptions.rollup`** | `Object`
  - Snowpack uses Rollup internally to install your packages. This `rollup` config option gives you deeper control over the internal rollup configuration that we use.
  - **`installOptions.rollup.plugins`** - Specify [Custom Rollup plugins](#installing-non-js-packages) if you are dealing with non-standard files.
  - **`installOptions.rollup.dedupe`** - If needed, deduplicate multiple versions/copies of a packages to a single one. This helps prevent issues with some packages when multiple versions are installed from your node_modules tree. See [rollup-plugin-node-resolve](https://github.com/rollup/plugins/tree/master/packages/node-resolve#usage) for more documentation.
