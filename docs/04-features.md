## Features

### Hot Module Replacement

Hot Module Replacement (HMR) is the ability to update your web app during development without refreshing the page. Imagine changing some CSS, hitting save, and then instantly seeing your change reflected on the page without a refresh. That's HMR.

Snowpack supports full HMR out-of-the-box for the following served files:

- CSS
- CSS Modules
- JSON

Popular frameworks can also be set up for HMR. **Create Snowpack App (CSA) ships with HMR enabled by default for all of the following frameworks.** If you're not using CSA, you can setup HMR in your own application with a simple plugin or a few lines of code:

- Preact: [@prefresh/snowpack](https://www.npmjs.com/package/@prefresh/snowpack)
- React: [@snowpack/plugin-react-refresh](https://www.npmjs.com/package/@snowpack/plugin-react-refresh)
- Svelte: [A few lines of code](https://github.com/pikapkg/create-snowpack-app/blob/master/templates/app-template-svelte/src/index.js#L9-L16)
- Vue: [A few lines of code](https://github.com/pikapkg/create-snowpack-app/blob/master/templates/app-template-vue/src/index.js#L7-L14)

For more advanced, bare-metal HMR integrations, Snowpack created [ESM-HMR](https://github.com/pikapkg/esm-hot-module-replacement-spec), a standard HMR API for any ESM-based dev environment. Any HMR integration built for ESM-HMR will run on Snowpack and any other ESM-HMR-enabled dev server. To use the HMR API directly (via `import.meta.hot`) check out [the ESM-HMR spec](https://github.com/pikapkg/esm-hot-module-replacement-spec) to learn more.

```js

if (import.meta.hot) {
  import.meta.hot.accept(({module}) => {
    // Accept the module, apply it to your application.
  });
  import.meta.hot.dispose(() => {
    // Cleanup any side-effects. Optional.
  });
}
```

- 👉 **[Check out the full ESM-HMR spec.](https://github.com/pikapkg/esm-hot-module-replacement-spec)**



### Import CSS

Snowpack supports basic CSS imports inside of your JavaScript files. While this isn't natively supported by any browser today, Snowpack's dev server and build pipeline both handle this for you.

```js
// Loads './style.css' onto the page
import './style.css' 
```

Snowpack also supports any popular CSS-in-JS library. If you prefer to avoid these non-standard CSS imports, check out [csz](https://github.com/lukejacksonn/csz). CSZ is a run-time CSS module library with support for SASS-like syntax/selectors.

### Import CSS Modules

Snowpack supports CSS Modules for CSS files using the `[name].module.css` naming convention. CSS Modules allow you to scope your CSS to unique class names & identifiers. CSS Modules return a default export (`styles` in the example below) that maps the original identifier to it's new, scoped value.

```css
/* src/style.module.css */
.error {
  background-color: red;
}
```

```js
// 1. Converts './style.module.css' classnames to unique, scoped values.
// 2. Returns an object mapping the original classnames to their final, scoped value.
import styles from './style.module.css' 

// This example uses JSX, but you can use CSS Modules with any framework.
return <div className={styles.error}>Your Error Message</div>;
```

### Import JSON

Snowpack supports importing JSON via ESM import. While this isn't yet supported in most browsers, it's a huge convenience over having vs. use fetch() directly.


```js
// JSON is returned as parsed via the default export
import json from './data.json' 
```

### Import Images & Other Assets

``` jsx
import img from './image.png'; // img === '/src/image.png'
import svg from './image.svg'; // svg === '/src/image.svg'

// This example uses JSX, but you can use these references with any framework.
<img src={img} />;
```

All other assets not explicitly mentioned above can be imported to get a URL reference to the asset. This can be useful for referencing assets inside of your JS, like creating an image element with a `src` attribute pointing to that image.


### Proxy Requests

Snowpack's dev server can proxy requests during development to match your production host environment. If you expect a certain API to be available on the same host as your web application, you can create a proxy via a `proxy` [Build Script](#build-scripts):

```js
// snowpack.config.json
// Example: Proxy "/api/pokemon/ditto" -> "https://pokeapi.co/api/v2/pokemon/ditto"
{
  "scripts": {
    "proxy:api": "proxy https://pokeapi.co/api/v2 --to /api"
  }
}
```

Learn more about [Build Script integrations](#build-scripts).


### JSX

#### Compile to JavaScript

When you write your web app with JSX, Snowpack will automatically build all `.jsx` & `.tsx` files to JavaScript during development and production builds. This works for both React & Preact as long as the file includes an import of React or Preact. 

**Note: JSX must live in `.jsx` files.** JSX in `.js` files is not supported.

If needed, you can optionally define your own JSX->JavaScript build step via a [Build Script integration](#build-scripts).

```js
// snowpack.config.json
// Optional: Build JSX files with Babel (must define your own babel.config.json)
{
  "scripts": {
    "build:jsx": "babel --filename $FILE",
  }
}
```

### TypeScript

#### Compile to JavaScript

Write your web app with TypeScript, and Snowpack will automatically build all `.ts` & `.tsx` files to JavaScript. Snowpack will not perform any type checking by default (see below), only building from TS->JS.

If needed, you can optionally define your ownTS->JS build step via a [Build Script integration](#build-scripts).

```js
// snowpack.config.json
// Optional: Build TS & TSX files with Babel (must define your own babel.config.json)
{
  "scripts": {
    "build:ts,tsx": "babel --filename $FILE",
  }
}
```

#### Type Checking During Development

You can integrate TypeScript type checking with Snowpack via a [Build Script integration](#build-scripts). Just add the TypeScript compiler (`tsc`) as a build command that gets run during your build with a `--watch` mode for development.

```js
// snowpack.config.json
// Example: Connect TypeScript CLI (tsc) reporting to Snowpack
{
  "scripts": {
    "run:tsc": "tsc --noEmit",
    "run:tsc::watch": "$1 --watch"
  }
}
```

### Import Maps

> Note [Import Maps](https://github.com/WICG/import-maps) are an experimental web technology that is not supported in every browser. For polyfilling import maps, [check out es-module-shims](https://github.com/guybedford/es-module-shims#import-maps).

Snowpack generates an [Import Map](https://github.com/WICG/import-maps) with every installation to `web_modules/import-map.json`. If your browser supports Import Maps, you can load the import map somewhere in your application and unlock the ability to import packages by name natively in the browser (no Babel step required).

``` markdown
<!-- Include this in your application HTML... -->
<script type="importmap" src="/web_modules/import-map.json"></script>

<!-- ... to enable browser-native package name imports. -->
import * as _ from 'lodash';
```

Note that Snowpack already performs these rewrites for you at both `dev` and `build` time, so this is only useful for experimentation and 3rd-party tooling integrations. As a general rule: if you don't care about this file, keep it but feel free to ignore it.


### Legacy Browser Support

You can customize the set of browsers you'd like to support via the `package.json` "browserslist" property. When running `snowpack build`, Snowpack will have Parcel transpile all JavaScript files according to the browser targets you've defined.

```js
/* package.json */
"browserslist": ">0.75%, not ie 11, not UCAndroid >0, not OperaMini all",
```

Note: During development (`snowpack dev`) we perform no transpilation for older browsers. Make sure that you're using a modern browser during development.


### Installing Non-JS Packages

When installing packages from npm, You may encounter some non-JS code that can only run with additional parsing/processing. Svelte packages, for example, commonly include `.svelte` files that will require additional tooling to parse and install for the browser.

Because our internal installer is powered by Rollup, you can add Rollup plugins to your [Snowpack config](#configuration-options) to handle these special, rare files:

```js
/* snowpack.config.js */
module.exports = {
  rollup: {
    plugins: [require('rollup-plugin-svelte')()]
  }
};
```

Refer to [Rollup’s documentation on plugins](https://rollupjs.org/guide/en/#using-plugins) for more information.
