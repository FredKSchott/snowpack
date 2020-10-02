## Troubleshooting

### No such file or directory

```
ENOENT: no such file or directory, open …/node_modules/csstype/index.js
```

This error message would sometimes occur in older versions of Snowpack.

**To solve this issue:** Upgrade to Snowpack `v2.6.0` or higher. If you continue to see this unexpected error in newer versions of Snowpack, please file an issue.

### Package exists but package.json "exports" does not include entry

Node.js recently added support for a package.json "exports" entry that defines which files you can and cannot import from within a package. Preact, for example, defines an "exports" map that allows you to to import "preact/hooks" but not "preact/some/custom/file-path.js". This allows packages to control their "public" interface.

If you see this error message, that means that you've imported a file path not allowed in the export map. If you believe this to be an error, reach out to the package author to request the file be added to their export map.

### Uncaught SyntaxError: The requested module '/web_modules/XXXXXX.js' does not provide an export named 'YYYYYY'

This is usually seen when importing a named export from a package written in the older Common.js format. Snowpack will try to automatically scan and detect these named exports for legacy Common.js packages, but this is not always possible.

**To solve this issue:** See our documentation on the ["namedExports"](#install-options) configuration option to resolve manually

### Installing Non-JS Packages

When installing packages from npm, you may encounter some file formats that can only run with additional parsing/processing. First check to see if there is a [Snowpack plugin for the type of file](#plugins).

Because our internal installer is powered by Rollup, you can also add Rollup plugins to your [Snowpack config](#configuration-options) to handle these special, rare files:

```js
/* snowpack.config.js */
module.exports = {
  rollup: {
    plugins: [require('rollup-plugin-sass')()],
  },
};
```

Refer to [Rollup’s documentation on plugins](https://rollupjs.org/guide/en/#using-plugins) for more information.
