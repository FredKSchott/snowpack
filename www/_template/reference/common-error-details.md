---
layout: layouts/content.njk
title: Common Error Details
---

This page details several common issues and error messages. For further help we have an active [GitHub Discussion forum](https://github.com/snowpackjs/snowpack/discussions)and [Discord](https://discord.gg/snowpack). Developers and community contributors frequently answer questions on both.

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

If you are using TypeScript, this error could occur if you are importing something that only exists in TypeScript (like a type or interface) and doesn't actually exist in the final JavaScript code. This issue is rare since our built-in TypeScript support will automatically extract and remove only type-only imports.

**To solve:** Make sure to use `import type { MyInterfaceName }` instead.

This error could also appear if you importing named exports from older, non-ESM npm packages. We do our best to statically analyze legacy packages for named exports, but this is not always possible. While this used to be a common problem for Snowpack users, thanks to improvements in our scanner this is no longer an issue the latest versions of Snowpack.

**To solve:** Use the default import (`import pkg from 'my-old-package'`) for legacy Common.js/UMD packages that cannot be analyzed.

### Installing Non-JS Packages

When installing packages from npm, you may encounter some file formats that can run only with additional parsing/processing. First check to see if there is a [Snowpack plugin for the type of file](#plugins).

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
