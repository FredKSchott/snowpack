## Advanced Usage

### Importing Packages by Name

```js
// ✘ NOT SUPPORTED IN THE BROWSER
// ✔ BUT... CAN BE TRANSFORMED BY BABEL
import 'package-name';
```

Browsers only support importing by URL, so importing a package by name (ex: `import React from 'react'`) isn't supported without additional tooling/configuration. Unless you're using a traditional app bundler or a build tool like Babel, you'll need to import all dependencies in your application by URL (ex: `import React from '/web_modules/react.js'`).

**If you use Babel with Snowpack, you can use our Babel plugin to support package name imports.** The plugin reads any packages name imports in your source code and rewrites them to full `"/web_modules/${PACKAGE_NAME}.js"` URLs that run in the browser. This way, you can keep using the package name imports that you're used to without needing a full web app bundler. Check out our guide below.

``` js
/* .babelrc */
  "plugins": [
    ["snowpack/assets/babel-plugin.js", {}],
  ]
```


### Import Maps

> Warning: [Import Maps](https://github.com/WICG/import-maps) are an experimental web technology that is not supported in every browser. For polyfilling import maps, [check out es-module-shims](https://github.com/guybedford/es-module-shims#import-maps).

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


### Caching in the Browser

The unbundled applications that Snowpack allows you to build can be ultra cache-efficient, with zero code duplication across page loads. But proper caching requires some helpful information from the server. Below is a list of caching strategies for your server that you can use with Snowpack.

#### ETag Headers

[ETag support](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag) is the easiest caching strategy to implement, and many hosting providers (like Zeit) will enable this for you automatically. From MDN:

> The ETag HTTP response header is an identifier for a specific version of a resource. It lets caches be more efficient and save bandwidth, as a web server does not need to resend a full response if the content has not changed. Additionally, etags help prevent simultaneous updates of a resource from overwriting each other ("mid-air collisions").
> -- https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag

#### Service Workers

Service workers can implement a client-side cache for your site regardless of what your server responses look like. Check out this article on ["Caching Files with Service Worker
"](https://developers.google.com/web/ilt/pwa/caching-files-with-service-worker), and be sure to read our [Workbox](#Workbox) guide below for help using [Workbox](https://developers.google.com/web/tools/workbox/) with Snowpack.

#### Automatic Cache Busting via Import URL

The browser cache is keyed by unique resource URL. This means that different URL query params will result in different cache hits (and cache misses) even if the server ignores them. Applications built with [Babel](#babel) can leverage this behavior to automatically control the cache.

The Snowpack Babel plugin supports an `"addVersion"` option that will automatically add the package version of any package import as a query parameter of the import URL in the final build. This effectively creates a new cache entry every time a dependency changes, which allows your server to send more aggressive long-term cache headers for the `web_modules/` directory.

``` js
/* .babelrc */
"plugins": [
  ["snowpack/assets/babel-plugin.js", {"addVersion": true}],
]
```

``` js
// src/ File Input
import Foo from 'package-name';
// lib/ Babel Output
import Foo from '/web_modules/package-name.js?v=1.2.3';
```


### Customize Transpilation

```js
  /* package.json */
  "browserslist": " >0.75%, not ie 11, not UCAndroid >0, not OperaMini all",
```

Snowpack runs all dependencies through Babel (via `@preset/env`) to transpile unsupported language features in your dependencies. This is useful when packages rely on modern language features that your users' browsers may not support.

By default, Snowpack will transpile using the recommended target string shown above. You you can customize this behavior by setting your own top-level "browserslist" key in your `package.json` manifest.


### Run After Every Install

``` js
  /* package.json */
  "scripts": {
    "prepare": "snowpack"
  }
```

You can optionally add "snowpack" as a `"prepare"` script to your `package.json` and npm/yarn will automatically run it after every new dependency install. This is recommended so that new dependencies are automatically included in your `web_modules/` directory immediately.



### Importing CSS

```js
// ✘ NOT SUPPORTED OUTSIDE OF BUNDLERS
import './style.css';
```

No browser today supports importing a CSS file directly from JS. Instead, you'll want to use one of the following libraries/solutions:

1. **Recommended!** If you're building a simple app, consider defining your CSS inside your HTML using a `<style>` block.
2. **Recommended!** [csz](https://github.com/lukejacksonn/csz) - "Runtime CSS modules with SASS like preprocessing"
3. [@emotion/core](https://emotion.sh/docs/@emotion/core) - "Simple styling in React." (Requires Babel)
4. Most CSS-in-JS libraries will work without a bundler, although some may require extra Babel plugins to work.

### Importing Images

```js
// ✘ NOT SUPPORTED OUTSIDE OF BUNDLERS
import './photo.png';
```

No browser today supports importing an image directly from JS. Instead, you'll want to use one of the following libraries/solutions:

1. **Recommended!** Keep referencing images by URL. You can put any image URL directly into an `<img>` src tag: `<img src="/img/photo.png">`.

