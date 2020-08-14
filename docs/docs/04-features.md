## JavaScript

### ES Modules (ESM)

Snowpack was designed to support JavaScript's native ES Module (ESM) syntax. ESM lets you define explicit imports & exports that browsers and build tools can better understand and optimize for. If you're familiar with the `import` and `export` keywords in JavaScript, then you already know ESM!

```js
// ESM Example - src/user.js
export function getUser() { /* ... */

// src/index.js
import {getUser} from './user.js';
```

All modern browsers support ESM, so Snowpack is able to ship this code directly to the browser during development. This is what makes Snowpack's **unbundled development** workflow possible.

Snowpack also lets you import non-JavaScript files directly in your application. Snowpack handles all this for you automatically so there's nothing to configure, using the following logic:

### Import NPM Packages

```js
// Returns the React & React-DOM npm packages
import React from 'react';
import ReactDOM from 'react-dom';
```

Snowpack lets you import npm packages directly in the browser. Even if a package was published using a legacy format, Snowpack will up-convert the package to ESM before serving it to the browser.

When you start up your dev server or run a new build, you may see a message that Snowpack is "installing dependencies". This means that Snowpack is converting your dependencies to run in the browser.

### Import JSON

```js
// Returns the JSON object via the default import
import json from './data.json';
```

Snowpack supports importing JSON files, which return the full JSON object in the default import.

### Import CSS

```js
// Loads './style.css' onto the page
import './style.css';
```

Snowpack supports basic CSS imports inside of your JavaScript files. When you import a CSS file via the `import` keyword, Snowpack will automatically apply those styles to the page. This works for CSS and compile-to-CSS languages like Sass & Less.

If you prefer, Snowpack also supports any popular CSS-in-JS library for styling.

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
import styles from './style.module.css';

// This example uses JSX, but you can use CSS Modules with any framework.
return <div className={styles.error}>Your Error Message</div>;
```

Snowpack supports CSS Modules using the `[name].module.css` naming convention. CSS Modules work just like normal CSS imports, but with a special default `styles` export that maps your original classnames to unique identifiers.

### Import Images & Other Assets

```jsx
import img from './image.png'; // img === '/src/image.png'
import svg from './image.svg'; // svg === '/src/image.svg'

// This example uses JSX, but you can use these references with any framework.
<img src={img} />;
```

All other assets not explicitly mentioned above can be imported and will return a URL reference to the final built asset. This can be useful for referencing non-JS assets by URL, like creating an image element with a `src` attribute pointing to that image.

## Features

Snowpack ships with built-in support for the following file types, no configuration required:

- JavaScript (`.js`, `.mjs`)
- TypeScript (`.ts`, `.tsx`)
- JSX (`.jsx`, `.tsx`)
- CSS (`.css`)
- CSS Modules (`.module.css`)
- Images (`.svg`, `.jpg`, `.png`, etc.)

To customize build behavior and support new languages (`.scss`, `.svelte`, `.vue`), keep reading.

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

Add the `@snowpack/plugin-dotenv` plugin to your dev environment to automatically load environment variables from your project `.env` files. Visit the [plugin README](https://github.com/pikapkg/snowpack/tree/master/packages/@snowpack/plugin-dotenv) to learn more.

### Hot Module Replacement

Hot Module Replacement (HMR) is the ability to update your web app during development without refreshing the page. Imagine changing some CSS, hitting save, and then instantly seeing your change reflected on the page without a refresh. That's HMR.

Snowpack supports full HMR out-of-the-box for the following served files:

- CSS
- CSS Modules
- JSON

Popular frameworks can also be set up for HMR. **[Create Snowpack App (CSA)](https://github.com/pikapkg/snowpack/blob/master/packages/create-snowpack-app) ships with HMR enabled by default for all of the following frameworks.** If you're not using CSA, you can setup HMR in your application with a simple plugin or a few lines of code:

- Preact: [@prefresh/snowpack](https://www.npmjs.com/package/@prefresh/snowpack)
- React: [@snowpack/plugin-react-refresh](https://www.npmjs.com/package/@snowpack/plugin-react-refresh)
- Svelte: [A few lines of code](https://github.com/pikapkg/snowpack/blob/master/packages/@snowpack/app-template-svelte/src/index.js#L9-L16)
- Vue: [A few lines of code](https://github.com/pikapkg/snowpack/blob/master/packages/@snowpack/app-template-vue/src/index.js#L7-L14)

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

### Legacy Browser Support

You can customize the set of browsers you'd like to support via the `package.json` "browserslist" property, going all the way back to IE11. This will be picked up when you run `snowpack build` to build for production.

```js
/* package.json */
"browserslist": ">0.75%, not ie 11, not UCAndroid >0, not OperaMini all",
```

If you're worried about legacy browsers, you should also add a bundler to your production build. Check out our [section on bundling for production](#bundle-for-production) for more info.

Note: During development (`snowpack dev`) we perform no transpilation for older browsers. Make sure that you're using a modern browser during development.

### CSS @import Support

Snowpack supports native CSS "@import" behavior. This behaves slightly differently from JavaScript's `import` behavior. In CSS, `@import 'foo/bar.css'` points to the relative file `./foo/bar.css` and not some package "foo". There is no currently no way to use the native `@import` statement to import from a package by name.

If you'd like to use `@import` to import from a package by name, you can use [PostCSS](#postcss) with the [postcss-import](https://github.com/postcss/postcss-import) plugin. Alternatively, you can use a JavaScript import to import a CSS file by package name (`import 'foo/bar.css';`).

**Note for webpack users:** If you're migrating an existing app to snowpack, note that `@import '~package/...'` (URL starting with a tilde) is a syntax specific to webpack. With `postcss-import` you have to remove the `~` from your `@import`s.

