## Troubleshooting

### Node built-in could not be resolved

```
✖ /my-application/node_modules/dep/index.js
  "http" (Node.js built-in) could not be resolved.
```

Some packages are written with dependencies on Node.js built-in modules. This is a problem on the web, since Node.js built-in modules don't exist in the browser. For example, `import 'path'` will run just fine in Node.js but would fail in the browser.

To solve this issue, you can either replace the offending package ([pika.dev](https://pika.dev/) is a great resource for web-friendly packages) or add Node.js polyfill support:

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


