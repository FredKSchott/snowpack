## Features

### Hot Module Replacement

Hot Module Replacement (HMR) is the ability to update your web app during development without refreshing the page. Imagine changing some CSS, hitting save, and then instantly seeing your change reflected on the page without a refresh. That's HMR.

Snowpack supports full HMR out-of-the-box for the following served files:

- CSS
- CSS Modules
- JSON

Popular frameworks can also be set up for HMR. **[Create Snowpack App (CSA)](https://github.com/pikapkg/create-snowpack-app) ships with HMR enabled by default for all of the following frameworks.** If you're not using CSA, you can setup HMR in your own application with a simple plugin or a few lines of code:

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

```js
// Loads './style.css' onto the page
import './style.css' 
```

Snowpack supports basic CSS imports inside of your JavaScript files. While this isn't natively supported by any browser today, Snowpack's dev server and build pipeline both handle this for you.

Snowpack also supports any popular CSS-in-JS library. If you prefer to avoid these non-standard CSS imports, check out [csz](https://github.com/lukejacksonn/csz). CSZ is a run-time CSS module library with support for SASS-like syntax/selectors.

### Import CSS Modules

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

Snowpack supports CSS Modules for CSS files using the `[name].module.css` naming convention. CSS Modules allow you to scope your CSS to unique class names & identifiers. CSS Modules return a default export (`styles` in the example below) that maps the original identifier to it's new, scoped value.

### Import JSON

```js
// JSON is returned as parsed via the default export
import json from './data.json' 
```

Snowpack supports importing JSON via ESM import. While this isn't yet supported in most browsers, it's a huge convenience over having to use fetch() directly.


### Import Images & Other Assets

``` jsx
import img from './image.png'; // img === '/src/image.png'
import svg from './image.svg'; // svg === '/src/image.svg'

// This example uses JSX, but you can use these references with any framework.
<img src={img} />;
```

All other assets not explicitly mentioned above can be imported to get a URL reference to the asset. This can be useful for referencing assets inside of your JS, like creating an image element with a `src` attribute pointing to that image.

### Import Aliases


```js
// Instead of this:
import Button from `../../../../components/Button`;

// You can do this:
import Button from `@app/components/Button`;
```

Snowpack supports setting custom import aliases for your project via the top-level `alias` property. This can be used to define an alias for either a local source directory (like aliasing `@app` to `./src`) or a package (like aliasing `react` to `preact/compat`). See the full documentation for `alias` below.

**TypeScript Users:** You'll need to configure your `tsconfig.json` `paths` to get proper types from top-level imports. Learn more about ["path mappings"](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping).

```js
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      // Define either ONE of these...
      // 1. General support: matches everything relative to the project directory
      "*": ["*"],
      // 2. Explicit support: match only your mounted directories (Recommended!)
      "src/*": ["src/*"],
      "public/*": ["public/*"],
    }
  }
}
```


### JSX

Snowpack has built-in support to handle `.jsx` & `.tsx` source files in your application. 

**Note: Snowpack's default build does not support JSX in  `.js`/`.ts` files.** If you can't use the `.jsx`/`.tsx` file extension, you'll need to manually add a build plugin to support this:

```js
// snowpack.config.json
// Optional: Babel supports JSX in .js & .ts files.
{
  "plugins": ["@snowpack/plugin-babel"]
}
```

### TypeScript

#### Compile to JavaScript

Snowpack has built-in support to handle `.ts` & `.tsx` source files in your application. If you prefer to use Babel, you can connect your own TS->JavaScript build plugin:

```js
// snowpack.config.json
// Optional: Babel is another popular build tool that supports TS.
{
  "plugins": ["@snowpack/plugin-babel"]
}
```

#### Type-Checking During Development

You can integrate TypeScript type checking with Snowpack via a "build script". Just add the TypeScript compiler (`tsc`) as a build command that gets run during your build with a `--watch` mode for development.

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

### Environment Variables

```js
// `import.meta.env` - Read process.env variables in your web app
fetch(`${import.meta.env.SNOWPACK_PUBLIC_API_URL}/users`).then(...)

// Supports destructuring as well:
const {SNOWPACK_PUBLIC_API_URL} = import.meta.env;
fetch(`${SNOWPACK_PUBLIC_API_URL}/users`).then(...)

// Instead of `import.meta.env.NODE_ENV` use `import.meta.env.MODE`
if (import.meta.env.MODE === 'development') {
  // ...
```

You can read environment variables directly in your web application via `import.meta.env`. If you've ever used `process.env` in Create React App or any Webpack application, this behaves exactly the same.

For your safety, Snowpack only supports environment variables that begin with `SNOWPACK_PUBLIC_*`. We do this because everything in your web application is sent to the browser, and we don't want you to accidentally share sensitive keys/env variables with your public web application. Prefixing your frontend web env variables with `SNOWPACK_PUBLIC_` is a good reminder that they will be shared with the world. 

`import.meta.env.MODE` and `import.meta.env.NODE_ENV` are also both set to the current `process.env.NODE_ENV` value, so that you can change app behavior based on dev vs. build. The env value is set to `development` during `snowpack dev` and `production` during `snowpack build`. Use this in your application instead of `process.env.NODE_ENV`. 

**Remember:** that these env variables are statically injected into your application for everyone at **build time**, and not runtime.

#### `.env` File Support

```js
// snowpack.config.json
{
  "plugins": ["@snowpack/plugin-dotenv"]
}
```

Add the `@snowpack/plugin-dotenv` plugin to your dev environment to automatically load environment variables from your project `.env` files. Visit the [plugin README](https://github.com/pikapkg/create-snowpack-app/tree/master/packages/plugin-dotenv) to learn more.


### Dev Request Proxy

```js
// snowpack.config.json
// Example: Proxy "/api/pokemon/ditto" -> "https://pokeapi.co/api/v2/pokemon/ditto"
{
  "proxy": {
    "/api": "https://pokeapi.co/api/v2",
  }
}
```

Snowpack can proxy requests from the dev server to external URLs and APIs. Making API requests directly the dev server can help you mimic your production environment during development.

See the [Proxy Options](#proxy-options) section for more information and full set of configuration options.

### HTTPS/HTTP2

```
npm start -- --secure
```

Snowpack provides an easy way to use a local HTTPS server during development through the use of the `--secure` flag. When enabled, Snowpack will look for a `snowpack.key` and `snowpack.crt` file in the root directory and use that to create an HTTPS server with HTTP2 support enabled.


#### Generating SSL Certificates

You can automatically generate credentials for your project via either: 

- [devcert (no install required)](https://github.com/davewasmer/devcert-cli): `npx devcert-cli generate localhost`
- [mkcert (install required)](https://github.com/FiloSottile/mkcert): `mkcert -install && mkcert -key-file snowpack.key -cert-file snowpack.crt localhost`
   

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

You can customize the set of browsers you'd like to support via the `package.json` "browserslist" property, going all the way back to IE11. This will be picked up when you run `snowpack build` to build for production.

```js
/* package.json */
"browserslist": ">0.75%, not ie 11, not UCAndroid >0, not OperaMini all",
```

If you're worried about legacy browsers, you should also add a bundler to your production build. Check out our [build documentation](https://www.snowpack.dev/#snowpack-build) for more info.

Note: During development (`snowpack dev`) we perform no transpilation for older browsers. Make sure that you're using a modern browser during development.


### Install Non-JS Packages

When installing packages from npm, You may encounter some non-JS code that can only run with additional parsing/processing. Svelte packages, for example, commonly include `.svelte` files that will require additional tooling to parse and install for the browser.

Because our internal installer is powered by Rollup, you can add Rollup plugins to your [Snowpack config](#configuration-options) to handle these special, rare files. 

```js
/* snowpack.config.js */
module.exports = {
  installOptions: {
    rollup: {
      plugins: [require('rollup-plugin-svelte')()]
    }
  }
};
```

Note that this currently requires you use the `.js` format of our Snowpack config files, since JSON cannot require to load a Rollup plugin. 

Refer to [Rollup’s documentation on plugins](https://rollupjs.org/guide/en/#using-plugins) for more information on adding Rollup plugins to our installer.
