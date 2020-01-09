## Advanced Usage

### Import Maps

> Warning: [Import Maps](https://github.com/WICG/import-maps) are an experimental web technology that is not supported in every browser. 

```
// Include this in your application HTML...
<script type="importmap" src="/web_modules/import-map.json"></script>
// ... to enable browser-native package name imports.
import * as _ from 'lodash';
```

Snowpack generates an [Import Map](https://github.com/WICG/import-maps) with every installation. If your browser supports Import Maps, you can load the import map somewhere in your application and unlock the ability to import packages by name natively in the browser (no Babel step required).


### Production Optimization

![Tree-shaking example](/img/treeshaking.jpg)

```
$ npx snowpack --optimize
```

By default, Snowpack installs dependencies unminified and optimized for development. When you're ready for production, run Snowpack with the `--optimize` flag to enable certain production-only optimizations:

- **Minification:** Dependencies will be minified (source maps included).
- **Transpilation:** Dependencies will be transpiled to match your application's [browser support target](#customize-browser-support) (in case any packages are written using too-modern language features).
- **Tree-Shaking:** Dependencies will have any unused code removed (when "Automatic Mode" is enabled via the `--include` flag).

### Customize Transpilation

```js
  /* package.json */
  "browserslist": " >0.75%, not ie 11, not UCAndroid >0, not OperaMini all",
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
