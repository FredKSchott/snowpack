## Troubleshooting

### Node built-in could not be resolved

```
✖ /my-application/node_modules/dep/index.js
  "http" (Node.js built-in) could not be resolved.
```

Some packages are written with dependencies on Node.js built-in modules. This is a problem on the web, since Node.js built-in modules don't exist in the browser. For example, `import 'path'` will run just fine in Node.js but would fail in the browser.

**To solve this issue:** you can either replace the offending package ([pika.dev](https://pika.dev/) is a great resource for web-friendly packages) or add Node.js polyfill support:

```js
// snowpack.config.js
// Plugin: https://github.com/ionic-team/rollup-plugin-node-polyfills
module.exports = {
  installOptions: {
    rollup: {
      plugins: [require("rollup-plugin-node-polyfills")()]
    }
  }
};
```

### No such file or directory

```
ENOENT: no such file or directory, open …/node_modules/csstype/index.js
```

This error message would sometimes occur in older versions of Snowpack. 

**To solve this issue:** Upgrade to Snowpack `v2.6.0` or higher. If you continue to see this unexpected error in newer versions of Snowpack, please file an issue.


### Package exists but package.json "exports" does not include entry

Node.js recently added support for a package.json "exports" entry that defines which files you can and cannot import from within a package. Preact, for example, defines an "exports" map that allows you to to import "preact/hooks" but not "preact/some/custom/file-path.js". This allows packages to control their "public" interface.

If you see this error message, that means that you've imported a file path not allowed in the export map. If you believe this to be an error, reach out to the package author to request the file be added to their export map.