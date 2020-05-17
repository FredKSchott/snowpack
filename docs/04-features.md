## Features

### Hot Module Replacement

Hot Module Replacement (HMR) is the ability to update your web app during development without refreshing the page. Imagine changing some CSS, hitting save, and then instantly seeing your change reflected on the page without a refresh. That's HMR.

Snowpack supports full HMR out-of-the-box for the following served files:

- CSS
- CSS Modules
- JSON

Additionally, Snowpack's dev server provides a basic HMR API that plugins can use for automatic HMR. The following plugins enable HMR for your application:

- Preact: @prefresh/snowpack (coming soon!) 

If you'd like to use the HMR API directly (`import.meta.hot`), check out our [advanced overview of the HMR API](/extend/#hmr-api).


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

### Import Images, Assets

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

#### COMPILING TO JAVASCRIPT

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

#### Compiling to JavaScript

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

#### Managing 3rd-Party Types

If you are using npm or yarn to manage your frontend dependencies, there is nothing extra setup needed on your part. TypeScript already knows how to find those package type declarations inside your `node_modules/` directory. 

If you are using Snowpack to manage your frontend dependencies, Snowpack will automatically install all type declarations to the `web_modules/.types/` directory. There are no `@types/` packages to manage in this case: Snowpack fetches the best type declarations for you automatically. 

However, TypeScript isn't yet aware of this new `/web_modules/.types/` location by default. To properly load these package types with TypeScript, you'll want to add the following lines to your `tsconfig.json` so that your packages can continue to get type information:

```js
// tsconfig.json
{
  "compilerOptions": {
    // 1. TypeScript needs to know about the new package types location
    "baseUrl": "./",
    "paths": { "*": ["web_modules/.types/*"] },
    // 2. Don't fail if there are any errors inside community-provided type packages.
    "skipLibCheck": true
  }
}
```


### webDependencies

By default, Snowpack will install your `web_modules/` dependencies by reading package code out of your `node_modules/` directory. This means that each packages is installed twice in your project: first with npm/yarn and then again with Snowpack.

You can simplify your dependencies by configuring Snowpack to fully manage your frontend dependencies via the new "webDependencies" key in your `package.json` project manifest.

```diff
{
  "dependencies": {
    "@babel/core": "^1.2.3",
-   /* previously managed by npm */
-   "react": "^16.13.0",
-   "react-dom": "^16.13.0"
  },
+ /* now managed by Snowpack */
+ "webDependencies": {
+   "react": "^16.13.0",
+   "react-dom": "^16.13.0"
+ }
}
```

In the example above, `npm` or `yarn` would no longer see React as a dependency to install into `node_modules/`. Instead, Snowpack would install this package directly from the web to your `"web_modules/"` directory without ever reading from `node_modules/`. Snowpack would do all the work upfront to convert each package into a web-ready, single JS file that runs natively in your browser.

If you use TypeScript, this will automatically install types for each package, even if the package author didn't provide their own types. See our section on [TypeScript](#typescript) for more.

Snowpack also provides `add` & `rm` helper commands to help you manage your "webDependencies" config via the CLI.


### Lockfiles

When Snowpack manages and installs your packages via `webDependencies`, it will also save a `snowpack.lock.json` file to your project directory. **This file is important, so don't delete it!** This lockfile locks down the installed versions of your entire dependency tree, including sub-dependencies. When you have this file, you are guarenteed to get a reproducible, deterministic installation every time that you run `snowpack install`.

When it's time to update your dependencies. Delete this file and re-run `snowpack install`. This will generate an updated depenency tree and save an updated lockfile to your project.


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
