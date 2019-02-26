<p align="center">
  <img alt="Logo" src="https://next.pikapkg.com/static/img/pika-web-logo.png" width="280">
</p>

<p align="center">
  <strong>@pika/web</strong> • Drop the bundler. Install npm packages that run natively in the browser.
</p>


## Quickstart

```js
# To run @pika/web in your project:
$ npx @pika/web
# To run @pika/web in your project *on every npm install*:
$ npm install --save-dev @pika/web
{"scripts": {"prepare": "pika-web"}}
```

By default, @pika/web reads your `package.json` for a list of "dependencies", and installs any with a "module" entrypoint from your `node_modules/` directory into a new `web_modules/` directory.

You can also define a whitelist of "webDependencies" in your `package.json`, if your entire "dependencies" object is too large or contains unrelated, Node.js-only packages.

## Options

* `--strict`: Only support 100% ESM installations. By default, @pika/web will handle Common.js transitive dependencies.

## Why

Still TODO

## Special Thanks

@pika/web is powered internally by Rollup.
