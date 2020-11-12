---
layout: layouts/main.njk
title: Troubleshooting
---

## No such file or directory

```
ENOENT: no such file or directory, open …/node_modules/csstype/index.js
```

This error message would sometimes occur in older versions of Snowpack.

**To solve this issue:** Upgrade to Snowpack `v2.6.0` or higher. If you continue to see this unexpected error in newer versions of Snowpack, please file an issue.

## Package exists but package.json "exports" does not include entry

Node.js recently added support for a package.json "exports" entry that defines which files you can and cannot import from within a package. Preact, for example, defines an "exports" map that allows you to to import "preact/hooks" but not "preact/some/custom/file-path.js". This allows packages to control their "public" interface.

If you see this error message, that means that you've imported a file path not allowed in the export map. If you believe this to be an error, reach out to the package author to request the file be added to their export map.

## Uncaught SyntaxError: The requested module '/web_modules/XXXXXX.js' does not provide an export named 'YYYYYY'

#### Legacy Common.js Packages

This is usually seen when importing a named export from a package written in the older Common.js format. Snowpack will automatically scan legacy Common.js packages to detect its named exports, but sometimes these exports can't be detected statically.

**To solve this issue:** Add a ["namedExports"](#config.installoptions) entry in your Snowpack config file. This tells Snowpack to use a more-powerful runtime scanner on this legacy Common.js package to detect it's exports at runtime.

```json
// snowpack.config.json
// Example: add support for `import { Terminal } from 'xterm';`
"installOptions": {
  "namedExports": ["xterm"]
}
```

#### TypeScript imports

This could occur if you're attempting to import a named interface or other type from another compiled TypeScript file.

**To solve this issue:** Make sure to use `import type { MyInterfaceName }` instead.

## Installing Non-JS Packages

When installing packages from npm, you may encounter some file formats that can only run with additional parsing/processing. First check to see if there is a [Snowpack plugin for the type of file](#plugins).

Because our internal installer is powered by Rollup, you can also add Rollup plugins to your [Snowpack config](#configuration) to handle these special, rare files:

```js
/* snowpack.config.js */
module.exports = {
  rollup: {
    plugins: [require('rollup-plugin-sass')()],
  },
};
```

Refer to [Rollup’s documentation on plugins](https://rollupjs.org/guide/en/#using-plugins) for more information.
