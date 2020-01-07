## Advanced Usage

### Optimizing for Production

![Tree-shaking example](/img/treeshaking.jpg)

```
$ npx snowpack --optimize
```

By default, Snowpack installs dependencies optimized for development. When you're ready for production, you can run Snowpack with the `--optimize` flag to enable certain production-only optimizations:

- **Minification:** Dependencies will be minified (with source maps).
- **Transpilation:** Dependencies will be transpiled to match your application's [browser support target](#customize-browser-support) (in case any dependencies use too-modern language features).
- **Tree-Shaking:** Dependencies will have unused code removed based on your imports (when "Automatic Mode" is enabled via the `--include` flag).

### Customize Browser Support

```js
  /* package.json */
  "browserslist": " >0.75%, not ie 11, not UCAndroid all, not OperaMini all",
```

Snowpack runs all dependencies through Babel (via `@preset/env`) to transpile unsupported language features in your dependencies. This is useful when packages rely on modern language features that your users' browsers may not not support.

By default, Snowpack will transpile using the recommended target string shown above. You you can customize this behavior by setting your own top-level "browserslist" key in your `package.json` manifest.


### Run After Every Install

``` js
  /* package.json */
  "scripts": {
    "prepare": "snowpack"
  }
```

You can optionally add "snowpack" as a `"prepare"` script to your `package.json` and npm/yarn will automatically run it after every new dependency install. This is recommended so that new dependencies are automatically included in your `web_modules/` directory immediately.


### Using Import Maps

> Warning: [Import Maps](https://github.com/WICG/import-maps) are an experimental web technology that is not supported in every browser. 

```html
<script type="importmap" src="/web_modules/import-map.json"></script>
<script type="module">
  import * as _ from 'lodash';
</script>
```

Snowpack generates an [Import Map](https://github.com/WICG/import-maps) with every installation. If you're on the cutting edge, you can load this map somewhere in your application and unlock the ability to import packages by name.


### Migrating an Existing App

How you migrate an existing app to Snowpack depends on which Bundler features/plugins you're using. If you're only using the `import` statement to import other JavaScript files, the process should only take a couple of minutes. If you're importing CSS, images, or other non-JS content in your application, you'll need to first get rid of those Webpack-specific imports before migrating away from Webpack. 

Assuming you've removed all code specific to your bundler, you can use the following rough plan to migrate to Snowpack.

1. Use Babel to assist in the migration. If you don't want to use Babel, don't worry; You can always remove it after migrating.
1. Follow the Babel guide above to build your existing `src/` directory to a new `lib/` directory. 
1. Follow the Babel Plugin guide above to add the Snowpack Babel plugin so that your package imports will continue to run as is. Check your output `lib/` directory to make sure that dependency imports are being rewritten as expected.
1. Run your application in the browser! If everything is working, you're done! Otherwise, use your browser's dev tools to hunt down any remaining issues in your application code.

### Migrating off of Snowpack

Snowpack is designed for zero lock-in. If you ever feel the need to add a traditional application bundler to your stack (for whatever reason!) you can do so in seconds. 

Any application built with Snowpack should Just Work™️ when passed through Webpack/Rollup/Parcel. If you are importing packages by full URL (ex: `import React from '/web_modules/react.js'`), then a simple Find & Replace should help you re-write them to the plain package names  (ex: `import React from 'react'`) that bundlers expect.

