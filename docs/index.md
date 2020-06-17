---
title: Snowpack
description: A CDN for modern JavaScript packages on npm.
layout: layouts/main.njk

# Using Snowpack? Want to be featured on snowpack.dev?
# Add your project, organization, or company to the end of this list!
usersList:
  - ia:
    name: The Internet Archive
    img: https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Internet_Archive_logo_and_wordmark.svg/1200px-Internet_Archive_logo_and_wordmark.svg.png
    url: https://github.com/internetarchive/dweb-archive
  - intel:
    name: Intel
    img: https://upload.wikimedia.org/wikipedia/commons/c/c9/Intel-logo.svg
    url: https://twitter.com/kennethrohde/status/1227273971831332865
  - 1688:
    name: Alibaba 1688
    img: https://img.alicdn.com/tfs/TB1ZQlRKHr1gK0jSZFDXXb9yVXa-130-130.png
    url: https://www.1688.com
  - Svelvet:
    name: Svelvet
    img: https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/240/apple/237/spool-of-thread_1f9f5.png
    url: https://github.com/jakedeichert/svelvet
  - pika:
    name: Pika.dev
    img: https://www.pika.dev/static/img/logo5.svg
    url: https://www.pika.dev
  - Toast:
    name: Toast
    img: https://pbs.twimg.com/profile_images/1247642009856143360/-ubmDwlW_400x400.jpg
    url: https://github.com/ChristopherBiscardi/toast
  - maskable:
    name: Maskable.app
    img: https://maskable.app/favicon/favicon_196.png
    url: https://maskable.app/
  - web-skills:
    name: Web Skills
    img: https://andreasbm.github.io/web-skills/www/icon.svg
    url: https://andreasbm.github.io/web-skills
  - swissdev-javascript:
    name: SwissDev JavaScript Jobs
    img: https://static.swissdevjobs.ch/pictures/swissdev-javascript-jobs.svg
    url: https://swissdevjobs.ch/jobs/JavaScript/All
  - tradie-training:
    name: Tradie Training
    img: https://tt.edu.au/images/logo.png
    url: https://tt.edu.au
  - wemake-services:
    name: wemake.services
    img: https://avatars0.githubusercontent.com/u/19639014?s=200&v=4
    url: https://github.com/wemake-services
---
#### Who's Using Snowpack?

<div class="company-logos">
{% for user in usersList %}
  <a href="{{ user.url }}" target="_blank">
    {% if user.img %}<img class="company-logo" src="{{ user.img }}" alt="{{ user.name }}" />
    {% else %}<span>{{ user.name }}</span>
    {% endif %}
  </a>
{% endfor %}
<a href="https://github.com/pikapkg/snowpack/edit/master/docs/00.md" target="_blank" title="Add Your Project/Company!" class="add-company-button" >
  <svg style="height: 22px; margin-right: 8px;" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="plus" class="company-logo" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path></svg>
  Add your logo
</a>
</div>

## Overview

### What is Snowpack?

**Snowpack is a faster build tool for modern web apps.** Snowpack leverages [ESM imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) in your application to remove unnecessary bundling work during development. The end result is a build tool that starts up instantly and wastes no time rebuilding on every change. See changes reflected in the browser instantly.

[Check out our launch post](/posts/2020-05-26-snowpack-2-0-release/) to learn more.


### Key Features

- A dev environment that starts up in **50ms or less.**
- Changed files are rebuilt [instantly.](/#hot-module-replacement) 
- Integrates with your favorite bundler for [production builds](/#snowpack-build).
- Out-of-the-box support for [TypeScript, JSX, CSS Modules and more.](/#features)
- [Custom build scripts](/#build-scripts) & [third-party plugins](/#build-plugins) to connect your favorite tools.

### Library Support

<div class="grid-list">

- React
- Preact
- Svelte
- Vue
- lit-html
- lit-element
- Styled Components
- Tailwind CSS
- and more!

</div>

### Tooling Support

<div class="grid-list">

- Babel
- TypeScript
- PostCSS
- SASS
- esbuild
- 11ty
- and more!

</div>

### Browser Support

**Snowpack builds your site for both modern and legacy browsers (even IE11).** You can control and customize this behavior with the ["browserlist" package.json property](https://css-tricks.com/browserlist-good-idea/). 

The only requirement is that *during development* you use a [modern browser](http://caniuse.com/#feat=es6-module). Any recent release of Firefox, Chrome, or Edge will do. This is required to support the modern, bundle-free ESM imports that load your application in the browser.
## Get Started

### Install Snowpack

``` bash
# using npm
npm install --save-dev snowpack

# using yarn
yarn add --dev snowpack
```

Snowpack can also be installed globally via `npm install -g snowpack`. But, we recommend installing locally in every project via `--save-dev`/`--dev`. You can run the Snowpack CLI locally via package.json "scripts", npm's `npx snowpack`, or via `yarn snowpack`.

### Create Snowpack App (CSA)

The easiest way to get started with Snowpack is via [Create Snowpack App (CSA)](https://github.com/pikapkg/create-snowpack-app). CSA automatically initializes a starter application for you with a pre-configured, Snowpack-powered dev environment.

If you've ever used Create React App, this is a lot like that!

``` bash
npx create-snowpack-app new-dir --template [SELECT FROM BELOW] [--use-yarn]
```

### Official App Templates

- [@snowpack/app-template-blank](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-blank)
- [@snowpack/app-template-react](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-react)
- [@snowpack/app-template-react-typescript](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-react-typescript)
- [@snowpack/app-template-preact](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-preact)
- [@snowpack/app-template-svelte](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-svelte)
- [@snowpack/app-template-vue](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-vue)
- [@snowpack/app-template-lit-element](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-lit-element)
- [@snowpack/app-template-11ty](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-11ty)
- **[See all community templates](https://github.com/pikapkg/create-snowpack-app)**

<!--
### Tutorial: Starting from Scratch

While CSA is a great all-in-one starter dev environment, you may prefer to learn exactly how it works under the hood. In that case, we have this tutorial that walks you through how you can build your own Create React App -like dev environment with Snowpack and only a few lines of configuration.

**Coming Soon!**
-->

### Migrating an Existing App

Migrating an existing app to Snowpack is meant to be painless, since Snowpack supports most features and build tools that you're already using today (Babel, PostCSS, etc). If this is your first time using Snowpack you should start with a Create Snowpack App (CSA) template, copy over your "src" & "public" files from your old app, and then run `snowpack dev`, troubleshooting any remaining issues.

CSA is a good starting point for an existing application because it has a few common tools (like Babel) built in by default to replicate the full feature set of a traditional bundled app. CSA is also meant to be a drop-in replacement for Create React App, so any existing Create React App project should run via CSA with zero changes needed.

If you run into issues, search the rest of our docs site for information about importing CSS [from JS](#import-css) and [from CSS](#css-%40import-support), [asset references](#import-images-%26-other-assets), and more.
## Commands

### snowpack dev

![dev command output example](/img/snowpack-dev-startup-2.png)

Snowpack's dev server is an instant dev environment for any web application. `snowpack dev` stays fast by skipping all unnecessary bundling during development and serving individual files directly to the browser. That means **zero** upfront startup cost: Snowpack only starts building your app when you make your first request. This scales especially well to large projects, where you'd otherwise commonly see 30+ second dev startup times with a traditional bundler.

This magic is all possible thanks to Snowpack's npm package installer, which installs your packages so that they can run directly in the browser. When you develop or build your application, Snowpack automatically rewrites your imports to point to your Snowpack-installed, ready-to-run web dependencies.


``` js
// Your Code:
import * as React from 'react';
import * as ReactDOM from 'react-dom';

// Build Output:
import * as React from '/web_modules/react.js';
import * as ReactDOM from '/web_modules/react-dom.js';
```

Snowpack supports JSX & TypeScript source code by default, compiling your files to JavaScript before sending them to the browser. Connect any other favorite tools to fully customize and extend your build pipeline. your build. [Build Scripts](#build-scripts) & [Plugins](#build-plugins) tell Snowpack how to transform your source files, allowing you to code in whatever language you'd like. Vue, Svelte, PostCSS, SASS... go nuts!

### snowpack build

![build output example](/img/snowpack-build-example.png)

When you're ready to deploy your application, run `snowpack build` to generate a static production build of your site. Building is tightly integrated with your dev setup so that you are guaranteed to get a working copy of the same code you saw during development.

The default output of the `snowpack build` command is an exact copy of the code that you saw during development. Deploying this basic build is fine for simple sites, but you may want to optimize your site even further by bundling your final deployment for production. Minification, code-splitting, tree-shaking, dead code elimination, and more optimizations can all happen at this stage via bundling.

Snowpack maintains official plugins for both [Webpack](https://www.npmjs.com/package/@snowpack/plugin-webpack) and [Parcel](https://www.npmjs.com/package/@snowpack/plugin-parcel). Connect your favorite, and then run `snowpack build` to get a bundled build of your site for production. 

```js
// snowpack.config.json
{
  // Optimize your production builds with Webpack
  "plugins": [["@snowpack/plugin-webpack", {/* ... */}]]
}
```

If you don't want to use a bundler, that's okay too. Snowpack's default build will give you an unbundled site that also runs just fine. This is what the Snowpack project has been all about from the start: **Use a bundler because you want to, and not because you need to.**


### snowpack install

``` bash
✔ snowpack install complete. [0.88s]

  ⦿ web_modules/                 size       gzip       brotli   
    ├─ react-dom.js              128.93 KB  39.89 KB   34.93 KB   
    └─ react.js                  0.54 KB    0.32 KB    0.28 KB    
  ⦿ web_modules/common/ (Shared)
    └─ index-8961bd84.js         10.83 KB   3.96 KB    3.51 KB    
```


Snowpack originally became famous for it's npm package install. Since then, the installer has been integrated directly into the `dev` & `build` workflows so that you no longer need to run the Snowpack installer yourself. Feel free to skip this section and come back later: you probably won't ever need to run this command.

You can run the installer yourself via `snowpack install`. This will install your dependencies into a new top-level `web_modules/` directory in your project. To figure out which dependencies you need, Snowpack will scan your project for ESM `import` statements to find every npm package used by your application. You can also provide a list of package names manually via the ["install"](#all-config-options) config.

After installing, any `web_modules/` package can be imported and run directly in the browser with zero additional bundling or tooling required. This ability to import npm packages natively in the browser (without a bundler) is the foundation that all no-bundle development (and the rest of Snowpack) is built on top of.

``` html
<!-- This runs directly in the browser! -->
<script type='module'>
  import * as React from '/web_modules/react.js';
  console.log(React);
</script>
```

Again, all of this is built into Snowpack `dev` & `build` commands by default. But, you can use the `install` command to provide web-ready npm packages for your own dev server or build pipeline.
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

Snowpack supports importing JSON via ESM import. While this isn't yet supported in most browsers, it's a huge convenience over having vs. use fetch() directly.


### Import Images & Other Assets

``` jsx
import img from './image.png'; // img === '/src/image.png'
import svg from './image.svg'; // svg === '/src/image.svg'

// This example uses JSX, but you can use these references with any framework.
<img src={img} />;
```

All other assets not explicitly mentioned above can be imported to get a URL reference to the asset. This can be useful for referencing assets inside of your JS, like creating an image element with a `src` attribute pointing to that image.

### Top-Level Imports


```js
// Instead of this:
import Button from `../../../../components/Button`;

// You can do this:
import Button from `src/components/Button`;
```

Snowpack lets you import files relative to any mounted directory. Both styles of imports are supported, so you are free to use whichever you prefer.

Note that this only works for directories that have been mounted via a `mount:*` build script. If an import doesn't match a mounted directory, then it will be treated as a package. [Learn more about the "mount" script type.](#all-script-types)

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

#### Compile to JavaScript


Snowpack automatically builds all `.jsx` & `.tsx` files to JavaScript during development and production builds. 

**Note: Snowpack's default build supports JSX with both React & Preact as long as a React/Preact import exists somewhere in the file.** To set a custom JSX pragma, you can configure our default esbuild yourself:

```js
// snowpack.config.json
// Optional: Define your own JSX factory/fragment
{
  "scripts": {
    "build:tsx": "esbuild --jsx-factory=h --jsx-fragment=Fragment --loader=tsx"
  }
}
```

**Note: Snowpack's default build does not support JSX in  `.js`/`.ts` files.** You'll need to define your own build script to support this. You can define your own JSX->JavaScript build step via a [Build Script integration](#build-scripts).

```js
// snowpack.config.json
// Optional: You can define your own JSX build step if you'd like.
{
  "scripts": {
    "build:jsx": "babel --filename $FILE",
  }
}
```

### TypeScript

#### Compile to JavaScript

Snowpack automatically builds all `.ts` & `.tsx` files to JavaScript. Snowpack will not perform any type checking by default (see below), only building from TS->JS.

You could also choose to define your own JSX->JavaScript build step via a [Build Script integration](#build-scripts).

```js
// snowpack.config.json
// Optional: You can define your own TS build step if you'd like.
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

### Bundle for Production

You can bundle your application for production by connecting a bundler plugin like [@snowpack/plugin-webpack](https://www.npmjs.com/package/@snowpack/plugin-webpack) or [@snowpack/plugin-parcel](https://www.npmjs.com/package/@snowpack/plugin-parcel). Check out our [build documentation](#snowpack-build) to learn more.
## Configuration

Snowpack's behavior can be configured by CLI flags, a custom Snowpack config file, or both. [See the table below for the full list of supported options](#configuration-options).

### Config Files

Snowpack supports configuration files in multiple formats, sorted by priority order:

1. `--config [path]`: If provided.
1. `package.json`: A namespaced config object (`"snowpack": {...}`).
1. `snowpack.config.js`: (`module.exports = {...}`).
1. `snowpack.config.json`: (`{...}`).

### CLI Flags

```bash
# Show helpful info
$ snowpack --help

# {installOptions: {dest: 'CUSTOM_DIR/'}}
$ snowpack install --dest CUSTOM_DIR/

# {devOptions: {bundle: true}}
$ snowpack dev --bundle

# {devOptions: {bundle: false}}
$ snowpack dev --no-bundle
```

**CLI flags will be merged with (and take priority over) your config file values.** Every config value outlined below can also be passed as a CLI flag. Additionally, Snowpack also supports the following flags:

- **`--config [path]`** Set the path to your project config file.
- **`--help`** Show this help.
- **`--version`** Show the current version. 
- **`--reload`** Clear the local cache. Useful for troubleshooting installer issues.


### All Config Options

```js
{
  "install": [
    "htm",
    "preact",
    "preact/hooks", // A package within a package
    "unistore/full/preact.es.js", // An ESM file within a package (supports globs)
    "bulma/css/bulma.css" // A non-JS static asset (supports globs)
  ],
  "homepage": "/your-project",
  "scripts": { /* ... */ },
  "installOptions": { /* ... */ },
  "devOptions": { /* ... */ },
  "buildOptions": { /* ... */ },
  "proxy": { /* ... */ },
}
```

#### Top-Level Options

- **`extends`** | `string`
  - Inherit from a separate "base" config. Can be a relative file path, an npm package, or a file within an npm package. Your configuration will be merged on top of the extended base config.
- **`exclude`** | `string[]`
  - Exclude any files from scanning, building, etc. Defaults to exclude common test file locations: `['**/node_modules/**/*', '**/__tests__/*', '**/*.@(spec|test).@(js|mjs)']`
  - Useful for excluding tests and other unnecessary files from the final build. Supports glob pattern matching. 
- **`install`** | `string[]`
  - Known dependencies to install with Snowpack. Useful for installing packages manually and any dependencies that couldn't be detected by our automatic import scanner (ex: package CSS files).
- **`homepage`** | `string`
  - By default, Snowpack's builds your app assuming it will be hosted at the server root.
  - You can set the "homepage" whenever your project is deployed anywhere other than the domain's root URL.
  - Note: Snowpack will also read this value from your `package.json` manifest.
- **`scripts`**
  - Set build scripts to transform your source files. See the section below for more info.
- **`installOptions.*`**
  - Configure how npm packages are installed. See the section below for all options.
- **`devOptions.*`**
  - Configure your dev server and build workflows. See the section below for all options.
- **`proxy.*`**
  - Configure the dev server to proxy requests. See the section below for all options.

#### Install Options

- **`dest`** | `string`
  - *Default:`"web_modules"`*
  - Configure the install directory.
- **`sourceMap`** | `boolean`  
  - Emit source maps for installed packages.
- **`env`** | `{[ENV_NAME: string]: (string | true)}`
  - Sets a `process.env.` environment variable inside the installed dependencies. If set to true (ex: `{NODE_ENV: true}` or `--env NODE_ENV`) this will inherit from your current shell environment variable. Otherwise, set to a string (ex: `{NODE_ENV: 'production'}` or `--env NODE_ENV=production`) to set the exact value manually.
- **`treeshake`** | `boolean`
  - *Default:`false`, or `true` when run with `snowpack build`*
  - Treeshake your dependencies to optimize your installed files. Snowpack will scan your application to detect which exact imports are used from each package, and then will remove any unused imports from the final install via dead-code elimination (aka tree shaking).
- **`installTypes`** | `boolean`
  - Install TypeScript type declarations with your packages. Requires changes to your [tsconfig.json](#TypeScript) to pick up these types. 
- **`alias`** | `{[mapFromPackageName: string]: string}`
  - Alias an installed package name. This applies to imports within your application and within your installed dependency graph. 
  - Example: `"alias": {"react": "preact/compat", "react-dom": "preact/compat"}`
- **`namedExports`** | `string[]` 
  - Legacy Common.js (CJS) packages should only be imported by the default import (Example: `import reactTable from 'react-table'`)
  - But, some packages use named exports in their documentation, which can cause confusion for users. (Example: `import {useTable} from 'react-table'`)
  - You can enable "fake/synthetic" named exports for Common.js package by adding the package name under this configuration.
  - Example: `"namedExports": ["react-table"]`
- **`rollup`**
  - Snowpack uses Rollup internally to install your packages. This `rollup` config option gives you deeper control over the internal rollup configuration that we use. 
  - **`rollup.plugins`** - Specify [Custom Rollup plugins](#installing-non-js-packages) if you are dealing with non-standard files.
  - **`rollup.dedupe`** - If needed, deduplicate multiple versions/copies of a packages to a single one. This helps prevent issues with some packages when multiple versions are installed from your node_modules tree. See [rollup-plugin-node-resolve](https://github.com/rollup/plugins/tree/master/packages/node-resolve#usage) for more documentation.

#### Dev Options

- **`port`** | `number` | Default: `8080`
  - The port number to run the dev server on.
- **`out`** | `string` | Default: `"build"`
  - The local directory that we output your final build to.
- **`bundle`** | `boolean`
  - Create an optimized, bundled build for production. 
  - You must have [Parcel](https://parceljs.org/) as a dev dependency in your project.
  - If undefined, this option will be enabled if the `parcel` package is found.
- **`fallback`** | `string` | Default: `"index.html"`
  - When using the Single-Page Application (SPA) pattern, this is the HTML "shell" file that gets served for every (non-resource) user route. Make sure that you configure your production servers to serve this as well.
- **`open`** | `string` | Default: `"default"`
  - Opens the dev server in a new browser tab. If Chrome is available on macOS, an attempt will be made to reuse an existing browser tab. Any installed browser may also be specified. E.g., "chrome", "firefox", "brave". Set "none" to disable.
- **`hmr`** | `boolean` | Default: `true`
  - Toggles whether or not Snowpack dev server should have HMR enabled.

#### Build Options

- **`baseUrl`** | `string` | Default: `/`
  - In your HTML, replace all instances of `%PUBLIC_URL%` with this (inspired by the same [Create React App](https://create-react-app.dev/docs/using-the-public-folder/) concept). This is useful if your app will be deployed to a subdirectory.
- **`metaDir`** | `string` | Default: `__snowpack__`
  - By default, Snowpack outputs Snowpack-related metadata such as [HMR](#hot-module-replacement) and [ENV](#environment-variables) info to a folder called `__snowpack__`. You can rename that folder with this option (e.g.: `metaDir: 'static/snowpack'`).

#### Proxy Options

```js
// snowpack.config.json
{
  "proxy": {
    // Short form:
    "/api/01": "https://pokeapi.co/api/v2/",
    // Long form:
    "/api/02": { 
      on: { proxyReq: (p, req, res) => /* Custom event handlers (JS only) */ },
      /* Custom http-proxy options */
    }
  }
}
```

If desired, `"proxy"` is where you configure the proxy behavior of your dev server. Define different paths that should be proxied, and where they should be proxied to. 

The short form of a full URL string is enough for general use. For advanced configuration, you can use the object format to set all options supported by [http-proxy](https://github.com/http-party/node-http-proxy).

`on` is a special property for setting event handler functions on proxy server events. See the section on ["Listening for Proxy Events"](https://github.com/http-party/node-http-proxy#listening-for-proxy-events) for a list of all supported events. You must be using a `snowpack.config.js` JavaScript configuration file to set this.

This configuration has no effect on the final build.
## Build Scripts

Snowpack is more than just a static file server, it's a platform to power your entire build pipeline. Babel, TypeScript, PostCSS, and any favorite build tool can be connected directly into Snowpack via simple, 1-line transformations. These transformations are called **build scripts.**

### Overview

A build script is just a simple bash (CLI) command. Snowpack will  pipe your source files into matching script commands (via stdin) and then send it's output (via stdout) to the browser.

If you've ever worked with `package.json` "scripts", creating your own build scripts should hopefully feel familiar:

```js
// snowpack.config.json
{
  "scripts": {
    // Pipe every .css file through PostCSS CLI
    "build:css": "postcss",
  }
}
```

**The `"build"` script type is the basic building block of any Snowpack build pipeline.** In this example `babel` & `postcss` are both used to process your code at dev time and then again when building for production. Each file is piped through the proper CLI to get the final build output.


```html
<!-- Example: Load "src/index.jsx" in the browser -->
<script type="module" src="/src/index.js"></script>
```

**By default, build scripts are run against every matching file in your project.** For large/complex projects, we recommend that you organize your source code into subdirectories (`src/`, `public/`, etc) that you can whitelist via "mount:" scripts.


 
### All Script Types

Snowpack supports several other script types in addition to the basic `"build"` type. These different script types serve different goals so that you can fully customize and control your dev environment:

- `"build:...": "..."`
  - Build matching files for your application. Snowpack will pipe files into the given bash command (CLI) as input, and capture its output as the build result.
  - ex: `"build:js,jsx": "babel --filename $FILE"`
- `"run:...": "..."`
  - Run a single bash command once, log any output/errors. Useful for tools like TypeScript that lint multiple files / entire projects at once.
  - ex: `"run:tsc": "tsc"`
- `"mount:...": "mount DIR [--to /PATH]"`
  - Copy a folder directly into the final build at the `--to` URL location.
  - If no `--to` argument is provided, the directory will be hosted at the same relative location.
  - ex: `"mount:public": "mount public --to /"`
  - ex: `"mount:web_modules": "mount web_modules"`
- **Deprecated** `"proxy:...": "proxy URL --to /PATH"`  (Use the `proxy` configuration object instead)

### Script Variables

Snowpack provides a few variables that you can use to make your build scripts (and plugins) more dynamic. Snowpack will replace these with the correct value when run:

- `$1` - The original command of a script modifier.
  - Useful to reduce copy-pasting in your scripts.
  - ex: `"run:ts,tsx::watch": "$1 --watch"`
- `$FILE` - The absolute path of the source file.
  - Especially useful when Babel plugins require it.
  - ex: `"build:js": "babel --filename $FILE`
- `$WEB_MODULES` - The location of your web_modules directory.
  - Especially useful for Snowpack internally, but not very useful otherwise.
  - ex: `"mount:web_modules": "mount $WEB_MODULES --to /web_modules`

### Script Modifiers ("::")

You can customize your build scripts even further via the `"::"` script modifier token. These act as addons to a previous matching script that extend that script's behavior:

- `"run:*::watch"`
  - This adds a watch mode to a previous "run" script, so that you can turn any supported linter into a live-updating watch command during development. 
  
```js
// snowpack.config.json
{
  "scripts": {
    // During build, runs TypeScript to lint your project.
    "run:ts,tsx": "tsc --noEmit",
    // During dev, runs `tsc --noEmit --watch` for live feedback.
    "run:ts,tsx::watch": "$1 --watch",
  }
}
```

Note that `$1` can be used with a script modifier to reference the original script. See the section on [Script Variables](#script-variables) above.
## Build Plugins

For more powerful integrations, Snowpack supports custom **build plugins**.  A build plugin is more than just a bash script: it's loaded via Node.js to customize and extend your Snowpack dev environment & build process. 

### Overview

A build plugin offers one of several different hooks into your application:

- `build()` - Automatically connects a build script to your build pipeline.
- `transform()` - Transform an already loaded resource before sending it to the browser.
- `bundle()` - Connect your favorite bundler for production.

[Check out our advanced plugin guide](/plugins) for more details and instructions for how to write your own.

### Plugin API

👉 **[Check out our advanced guide](/plugins) and learn how to create your own plugin.**

### Connect a Plugin

Connect a build plugin to Snowpack via the `"plugins"` array in your Snowpack config;

```js
// snowpack.config.json
{
  "plugins": ["@snowpack/plugin-babel"]
}
```

This is all you need to connect the plugin. If a build script is provided by the plugin, it will be automatically added to your "scripts" config. You can customize that script (and which files it will match) by defining the build script yourself. 

```js
// snowpack.config.json
// Optional: Define your own build script for "@snowpack/plugin-babel".
{
  "plugins": ["@snowpack/plugin-babel"],
  "scripts": {"build:js,jsx,mjs,cjs": "@snowpack/plugin-babel"}
}
```


### Plugin vs Script?

You can get pretty far with build scripts alone. If you just want to convert your source code to JavaScript/CSS and you have a CLI that can make that transformation for you, then a build script is probably fine. 

But, there are a few reasons you may want to use a build plugin instead of a normal build script:

**Speed:** Some CLIs may have a slower start-up time, which may become a problem as your site grows. Plugins can be faster across many files since they only need to be loaded & initialized once and not once for every file.

```js
"scripts": {
  // Speed: The Babel plugin is ~10x faster than using the Babel CLI directly
  "build:js,jsx": "@snowpack/plugin-babel",
}
```

**Lack of CLI:** Some frameworks, like Svelte, don't maintain dedicated CLIs. Snowpack Plugins allow you to tap into a tool's JS interface directly without building a whole new CLI interface.

```js
"scripts": {
  // Lack of CLI: There is no Svelte CLI. Our plugin taps directly into the Svelte compiler 
  "build:svelte": "@snowpack/plugin-svelte",
}
```

**Custom Control:** You can write your own project-specific plugins easily, and load them via relative path without ever needing to publish them.

```js
"scripts": {
  // Custom Behavior: Feel free to build your own!
  "build:vue": "./my-custom-vue-plugin.js",
}
```
## Recipes

Below are a collection of guides for using different web frameworks and build tools with Snowpack. If you'd like to contribute a new recipe, feel free to edit the docs to add your own.

### Supported Libraries

All of the following frameworks have been tested and guaranteed to work in Snowpack without issues. If you encounter an issue using any of the following, please file an issue.

- React
- Preact
- JSX
- HTM
- lit-html
- Vue (see below)
- Svelte (see below)
- Tailwind CSS (see below)
- Sass (see below)
- and many more!
- Literally... every library should work with Snowpack!

Some libraries use compile-to-JS file formats and do require a special build script or plugin. See the guide below for examples.

### Preact

You can import and use Preact without any custom configuration needed.

**To use `preact/compat`:** (the Preact+React compatability layer) alias the "compat" package to React in your install options:

```js
// Example: Lets you Iiport "react" in your application, but uses preact internally
// snowpack.config.json
"installOptions": {
  "alias": {
    "react": "preact/compat",
    "react-dom": "preact/compat"
  }
}
```

### Babel

Babel will automatically read plugins & presets from your local project `babel.config.*` config file, if one exists.

#### via plugin (Recommended)

```js
// snowpack.config.json
"plugins": ["@snowpack/plugin-babel"],
"scripts": {
  "build:js,jsx": "@snowpack/plugin-babel"
}
```

#### via @babel/cli

```js
// snowpack.config.json
// NOTE: Not recommended, Babel CLI is slower than the plugin on large sites.
"scripts": {
  "build:js,jsx": "babel --filename $FILE"
}
```

### Vue


```js
// snowpack.config.json
// Note: The plugin will add a default build script automatically
"plugins": ["@snowpack/plugin-vue"]
```

### Svelte

```js
// snowpack.config.json
// Note: The plugin will add a default build script automatically
"plugins": ["@snowpack/plugin-svelte"]
```


### PostCSS

```js
// snowpack.config.json
"scripts": {
  "build:css": "postcss"
}
```

The [`postcss-cli`](https://github.com/postcss/postcss-cli) package must be installed manually. You can configure PostCSS with a `postcss.config.js` file in your current working directory.

### CSS @import Support

The `@import` statements in CSS files [are not yet supported natively](https://github.com/pikapkg/snowpack/issues/389), meaning an `@import 'foo/bar.css'` (with a relative URL) will by default look for `foo/bar.css` in your app's `public/` directory only.

To allow relative `@import`s from the CSS files in your `src/` directory and to import CSS from other `node_modules`:
* Install PostCSS and add it to snowpack.config.json [as described above](#postcss)
* Install the [postcss-import](https://github.com/postcss/postcss-import) package
* Configure PostCSS to use the plugin, for example:
    ```js
    // postcss.config.js
    module.exports = {
      plugins: [
        // ...
        require('postcss-import')({path: ['resources/css']}),
        // ...
      ]
    ```

  If you're migrating an existing app to snowpack, note that `@import '~package/...'` (URL starting with a tilde) is a syntax specific to webpack. With `postcss-import` you have to remove the `~` from your `@import`s.

Alternatively [use `import 'path/to/css';` in your JS files without any configuration](#import-css).

### Tailwind CSS

```js
// postcss.config.js
// Taken from: https://tailwindcss.com/docs/installation#using-tailwind-with-postcss
module.exports = {
  plugins: [
    // ...
    require('tailwindcss'),
    require('autoprefixer'),
    // ...
  ]
}
```

Tailwind ships with first-class support for PostCSS. To use Tailwind in your Snowpack project, connect PostCSS ([see above](#postcss)) and add the recommended Tailwind PostCSS plugin to your snowpack configuration.

Follow the official [Tailwind CSS Docs](https://tailwindcss.com/docs/installation/#using-tailwind-with-postcss) for more info.

### Sass

```js
// snowpack.config.json
// Example: Build all src/css/*.scss files to public/css/*
"scripts": {
  "run:sass": "sass src/css:public/css --no-source-map",
  "run:sass::watch": "$1 --watch"
}

// You can configure this to match your preferred layout:
//
// import './App.css';
// "run:sass": "sass src:src --no-source-map",
//
// import 'public/css/App.css';
// "run:sass": "sass src/css:public/css --no-source-map",
// (Note: Assumes mounted public/ directory ala Create Snowpack App)
```

[Sass](https://www.sass-lang.com/) is a stylesheet language that’s compiled to CSS. It allows you to use variables, nested rules, mixins, functions, and more, all with a fully CSS-compatible syntax. Sass helps keep large stylesheets well-organized and makes it easy to share design within and across projects.

[Check out the official Sass CLI documentation](https://sass-lang.com/documentation/cli/dart-sass) for a list of all available arguments. You can also use the [node-sass](https://www.npmjs.com/package/node-sass) CLI if you prefer to install Sass from npm.

**Note:** Sass should be run as a "run:" script (see example above) to take advantage of the Sass CLI's partial handling. A `"build:scss"` script would build each file individually as its served, but couldn't handle Sass partials via `@use` due to the fact that Sass bundles these into the importer file CSS.

To use Sass + PostCSS, check out [this guide](https://zellwk.com/blog/eleventy-snowpack-sass-postcss/).

### ESLint

```js
// snowpack.config.json
"scripts": {
    "run:lint": "eslint 'src/**/*.{js,jsx,ts,tsx}'",
    // Optional: Use npm package "watch" to run on every file change
    "run:lint::watch": "watch \"$1\" src"
}
```

### Workbox

The [Workbox CLI](https://developers.google.com/web/tools/workbox/modules/workbox-cli) integrates well with Snowpack. Run the wizard to bootstrap your first configuration file, and then run `workbox generateSW` to generate your service worker.

Remember that Workbox expects to be run every time you deploy, as a part of a production "build" process (similar to how Snowpack's [`--optimize`](#production-optimization) flag works). If you don't have one yet, create package.json [`"deploy"` and/or `"build"` scripts](https://michael-kuehnel.de/tooling/2018/03/22/helpers-and-tips-for-npm-run-scripts.html) to automate your production build process.

### Server Side Rendering (SSR)

To connect your own server to `snowpack dev` for SSR, there are a few things that you'll need to set up. Make sure that you include any Snowpack-built resources via script tags in your server's HTML response:

```html
<!-- Example: Create Snowpack App builds your src/ directory to the /_dist_/* directory -->
<script type="module" src="http://localhost:8080/_dist_/index.js"></script>
```

And make sure that your HTML response also includes code to configure HMR to talk to Snowpack's dev server:

```html
<!-- Configure Snowpack's HMR connection yourself, somewhere on your page HTML -->
<script>window.HMR_WEBSOCKET_URL = "ws://localhost:8080"</script>
```


### Leaving Snowpack

Snowpack is designed for zero lock-in. If you ever feel the need to add a traditional application bundler to your stack (for whatever reason!) you can do so in seconds.

Any application built with Snowpack should Just Work™️ when passed through Webpack/Rollup/Parcel. If you are already importing packages by name in your source code (ex: `import React from 'react'`) then you should be able to migrate to any popular bundler without issue.

If you are importing packages by full URL (ex: `import React from '/web_modules/react.js'`), then a simple Find & Replace should help you re-write them to the plain package name imports that most bundlers expect.
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


## Assets

- [Snowpack Logo (PNG, White)](/assets/snowpack-logo-white.png)
- [Snowpack Logo (PNG, Dark)](/assets/snowpack-logo-dark.png)
- [Snowpack Logo (PNG, Black)](/assets/snowpack-logo-black.png)
- [Snowpack Wordmark (PNG, White)](/assets/snowpack-wordmark-white.png)
- [Snowpack Wordmark (PNG, Black)](/assets/snowpack-wordmark-black.png)