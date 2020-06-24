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

If you encounter a warning message such as this:

```
ENOENT: no such file or directory, open …/node_modules/csstype/index.js
```

That may be due to the fact that there was nothing Snowpack could bundle. In the case of `csstype`, it only emits a TypeScript definition (`.d.ts`) file, so Snowpack can’t bundle it!

There are 2 ways to solve this:

##### Option 1: importing `type`

```ts
import type { something } from 'csstype';
```

Using the `import type` keyword is friendlier in most cases. Sometimes Snowpack can correctly determine when you’re importing TypeScript types, but sometimes it has trouble—mostly it depends on how each package is configured (and no 2 packages are alike!). Using `import type` helps.

##### Option 2: manual `install`

If Snowpack still is having trouble with certain packages, you can manually set `install` in `snowpack.config.js` like so:

```json
{
  "install": ["package-one", "package-two", "package-three"]
}
```

This isn’t ideal because now you have to maintain this list, and omit the packages that are giving you trouble. However, sometimes this is the quickest way to fix the issue.

### Package exists but package.json "exports" does not include entry

Node.js recently added support for a package.json "exports" entry that defines which files you can and cannot import from within a package. Preact, for example, defines an "exports" map that allows you to to import "preact/hooks" but not "preact/some/custom/file-path.js". This allows packages to control their "public" interface.

If you see this error message, that means that you've imported a file path not allowed in the export map. If you believe this to be an error, reach out to the package author to request the file be added to their export map.