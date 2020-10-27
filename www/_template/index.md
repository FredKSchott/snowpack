---
layout: layouts/main.njk

# Using Snowpack? Want to be featured on snowpack.dev?
# Add your project, organization, or company to the end of this list!
usersList:
  - ia:
    name: The Internet Archive
    img: https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Internet_Archive_logo_and_wordmark.svg/1200px-Internet_Archive_logo_and_wordmark.svg.png
    url: https://github.com/internetarchive/dweb-archive
  - 1688:
    name: Alibaba 1688
    img: https://s.cafebazaar.ir/1/icons/com.alibaba.intl.android.apps.poseidon_512x512.png
    url: https://www.1688.com
  - intel:
    name: Intel
    img: https://upload.wikimedia.org/wikipedia/commons/4/4e/Intel_logo_%282006%29.svg
    url: https://twitter.com/kennethrohde/status/1227273971831332865
  - circlehd.com:
    name: CircleHD
    img: https://www.circlehd.com/img/logo-sm.svg
    url: https://www.circlehd.com/
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
    img: https://www.toast.dev/toast-icon-300.png
    url: https://www.toast.dev
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
  - airhacks.com:
    name: airhacks.com
    img: https://airhacks.com/logo.svg
    url: https://airhacks.com
  - tongdun:
    name: tongdun
    img: https://www.tongdun.cn/static/favicon.ico
    url: https://www.tongdun.cn/
  - blessing-skin:
    name: Blessing Skin
    img: https://blessing.netlify.app/logo.png
    url: https://github.com/bs-community
---
## Overview

### What is Snowpack?

Snowpack is a modern frontend build tool for faster web development. It replaces heavier, more complex bundlers like webpack or Parcel in your development workflow.

Snowpack leverages JavaScript's native module system (<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import">known as ESM</a>) to create a first-of-its-kind build system that never builds the same file twice. Snowpack pushes changes instantly to the browser, saving you hours of development time traditionally spent waiting around for your bundler.

### Key Features

- Develop faster, with a dev server that starts up in **50ms or less.**
- See changes reflected [instantly in the browser.](/#hot-module-replacement)
- Integrate your favorite bundler for a [production-optimized build.](/#bundle-for-production)
- Enjoy out-of-the-box support for [TypeScript, JSX, CSS Modules and more.](/#features)
- Connect your favorite tools with [third-party plugins.](/#plugins)

### Who's Using Snowpack?

<div class="company-logos">
{% for user in usersList %}
  <a href="{{ user.url }}" target="_blank" rel="noopener noreferrer nofollow">
    {% if user.img %}<img class="company-logo" src="{{ user.img }}" alt="{{ user.name }}" />
    {% else %}<span>{{ user.name }}</span>
    {% endif %}
  </a>
{% endfor %}
<a href="https://github.com/snowpackjs/snowpack/edit/master/docs/docs/00.md" target="_blank" title="Add Your Project/Company!" class="add-company-button" >
  <svg style="height: 22px; margin-right: 8px;" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="plus" class="company-logo" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path></svg>
  Add your logo
</a>
</div>

### How Snowpack Works

**Snowpack is a modern, lightweight build tool for faster web development.** Traditional JavaScript build tools like webpack and Parcel need to rebuild & rebundle entire chunks of your application every time you save a single file. This rebundling step introduces lag between hitting save on your changes and seeing them reflected in the browser.

Snowpack serves your application **unbundled during development.** Every file only needs to be built once and then is cached forever. When a file changes, Snowpack rebuilds that single file. There's no time wasted re-bundling every change, just instant updates in the browser (made even faster via [Hot-Module Replacement (HMR)](#hot-module-replacement)). You can read more about this approach in our [Snowpack 2.0 Release Post.](/posts/2020-05-26-snowpack-2-0-release/)

Snowpack's **unbundled development** still supports the same **bundled builds** that you're used to for production. When you go to build your application for production, you can plug in your favorite bundler via an official Snowpack plugin for Webpack or Rollup (coming soon). With Snowpack already handling your build, there's no complex bundler config required.

**Snowpack gets you the best of both worlds:** fast, unbundled development with optimized performance in your bundled production builds.

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
- [and more!](/#recipes)
<!-- Missing something? Feel free to add your own! -->

</div>

### Tooling Support

<div class="grid-list">

- Babel
- TypeScript
- PostCSS
- Sass
- esbuild
- 11ty
- [and more!](/#recipes)
<!-- Missing something? Feel free to add your own! -->

</div>

### Browser Support

**Snowpack builds your site for both modern and legacy browsers. Even IE11 is supported.** You can control and customize this behavior with the ["browserlist" package.json property](https://css-tricks.com/browserlist-good-idea/).

The only requirement is that _during development_ you use a [modern browser](http://caniuse.com/#feat=es6-module). Any recent release of Firefox, Chrome, or Edge will do. This is required to support the modern, bundle-free ESM imports that load your application in the browser.

### Community

<a href="https://discord.gg/zxSwN8Z"><img alt="Join us on Discord!" src="https://img.shields.io/discord/712696926406967308.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2" style="height: 24px; border: none;"/></a>

[Join the Pika Discord](https://discord.gg/rS8SnRk) for discussion, questions about Snowpack or related Pika projects, or to show off what you’re working on!
## Get Started

### Install Snowpack

```bash
# using npm
npm install --save-dev snowpack

# using yarn
yarn add --dev snowpack
```

Snowpack can also be installed globally via `npm install -g snowpack`. But, we recommend installing locally in every project via `--save-dev`/`--dev`. You can run the Snowpack CLI locally via package.json "scripts", npm's `npx snowpack`, or via `yarn snowpack`.

### Quick Start

Here's a short list of what you can do with Snowpack:

```bash
# Start your dev server, load your site locally
snowpack dev

# Build your site for production
snowpack build

# Build your site, but watch the file system and rebuild when files change.
# Great for local development with your own dev server (ex: Rails)
snowpack build --watch

# See more helpful info
snowpack --help
```

### Create Snowpack App (CSA)

The easiest way to get started with Snowpack is via [Create Snowpack App (CSA)](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app). CSA automatically initializes a starter application for you with a pre-configured, Snowpack-powered dev environment.

If you've ever used Create React App, this is a lot like that!

```bash
npx create-snowpack-app new-dir --template [SELECT FROM BELOW] [--use-yarn]
```

### Official App Templates

- [@snowpack/app-template-blank](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/app-template-blank)
- [@snowpack/app-template-blank-typescript](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/app-template-blank-typescript)
- [@snowpack/app-template-minimal](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/app-template-minimal)
- [@snowpack/app-template-react](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/app-template-react)
- [@snowpack/app-template-react-typescript](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/app-template-react-typescript)
- [@snowpack/app-template-preact](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/app-template-preact)
- [@snowpack/app-template-svelte](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/app-template-svelte)
- [@snowpack/app-template-vue](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/app-template-vue)
- [@snowpack/app-template-lit-element](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/app-template-lit-element)
- [@snowpack/app-template-lit-element-typescript](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/app-template-lit-element-typescript)
- [@snowpack/app-template-11ty](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/app-template-11ty)

- **[See all community templates](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/cli#featured-community-templates)**

<!--
### Tutorial: Starting from Scratch

While CSA is a great all-in-one starter dev environment, you may prefer to learn exactly how it works under the hood. In that case, we have this tutorial that walks you through how you can build your own Create React App -like dev environment with Snowpack and only a few lines of configuration.

**Coming Soon!**
-->

### Migrating an Existing App

Migrating an existing app to Snowpack is meant to be painless, since Snowpack supports most features and build tools that you're already using today (Babel, PostCSS, etc). If this is your first time using Snowpack you should start with a Create Snowpack App (CSA) template, copy over your "src" & "public" files from your old app, and then run `snowpack dev`, troubleshooting any remaining issues.

CSA is a good starting point for an existing application because it has a few common tools (like Babel) built in by default to replicate the full feature set of a traditional bundled app. CSA is also meant to be a drop-in replacement for Create React App, so any existing Create React App project should run via CSA with zero changes needed.

If you run into issues, search the rest of our docs site for information about importing CSS [from JS](#javascript) and [from CSS](#import-css), [asset references](#import-images-%26-other-assets), and more.
## Main Concepts

### Unbundled Development

![webpack vs. snowpack diagram](/img/snowpack-unbundled-example-3.png)

**Unbundled development** is the idea of shipping individual files to the browser during development. Files can still be built with your favorite tools (like Babel, TypeScript, Sass) and then loaded individually in the browser with dependencies thanks to ESM `import` and `export` syntax. Any time you change a file, Snowpack only ever needs to rebuild that single file.

The alternative is **bundled development.** Almost every popular JavaScript build tool today focuses on bundled development. Running your entire application through a bundler introduces additional work and complexity to your dev workflow that is unnecessary now that ESM is widely supported. Every change -- on every save -- must be rebundled with the rest of your application before your changes can be reflected in your browser.

Unbundled development has several advantages over the traditional bundled development approach:

- Single-file builds are fast.
- Single-file builds are deterministic.
- Single-file builds are easier to debug.
- Project size doesn’t affect dev speed.
- Individual files cache better.

That last point is key: **Every file is built individually and cached indefinitely.** Your dev environment will never build a file more than once and your browser will never download a file twice (until it changes). This is the real power of unbundled development.

### Using NPM Dependencies

NPM packages are mainly published using a module syntax (Common.js, or CJS) that can't run on the web without some build processing. Even if you write your application using browser-native ESM `import` and `export` statements that would all run directly in the browser, trying to import any one npm package will force you back into bundled development.

**Snowpack takes a different approach:** Instead of bundling your entire application for this one requirement, Snowpack processes your dependencies separately. Here's how it works:

```
node_modules/react/**/*     -> http://localhost:3000/web_modules/react.js
node_modules/react-dom/**/* -> http://localhost:3000/web_modules/react-dom.js
```

1. Snowpack scans your website/application for all used npm packages.
2. Snowpack reads these installed dependencies from your `node_modules` directory.
3. Snowpack bundles all of your dependencies separately into single JavaScript files. For example: `react` and `react-dom` are converted to `react.js` and `react-dom.js`, respectively.
4. Each resulting file can be run directly in the browser, and imported via ESM `import` statements.
5. Because your dependencies rarely change, Snowpack rarely needs to rebuild them.

After Snowpack builds your dependencies, any package can be imported and run directly in the browser with zero additional bundling or tooling required. This ability to import npm packages natively in the browser (without a bundler) is the foundation that all unbundled development and the rest of Snowpack is built on top of.

```html
<!-- This runs directly in the browser with `snowpack dev` -->
<body>
  <script type="module">
    import React from 'react';
    console.log(React);
  </script>
</body>
```

### Snowpack's Dev Server

![dev command output example](/img/snowpack-dev-startup-2.png)

`snowpack dev` - Snowpack's dev server is an instant dev environment for [unbundled development.](#unbundled-development) The dev server will only build a file when it's requested by the browser. That means that Snowpack can start up instantly (usually in **<50ms**) and scale to infinitely large projects without slowing down. In contrast, it's common to see 30+ second dev startup times when building large apps with a traditional bundler.

Snowpack supports JSX & TypeScript source code by default. You can extend your build even further with [custom plugins](#plugins) that connect Snowpack with your favorite build tools: TypeScript, Babel, Vue, Svelte, PostCSS, Sass... go wild!

### Snowpack's Build Pipeline

![build output example](/img/snowpack-build-example.png)

`snowpack build` - When you're ready to deploy your application, run the build command to generate a static production build of your site. Building is tightly integrated with your dev setup so that you are guaranteed to get a near-exact copy of the same code that you saw during development.

### Bundle for Production

**You should be able to use a bundler because you want to, and not because you need to.** That was the original concept that Snowpack was designed to address. Snowpack treats bundling as an optional production optimization, which means you're free to skip over the extra complexity of bundling until you need it.

By default, `snowpack build` will build your site using the same unbundled approach as the `dev` command. This is fine for most projects, but you also may still want to bundle for production. Legacy browser support, code minification, code-splitting, tree-shaking, dead code elimination, and other performance optimizations can all be handled in Snowpack via bundling.

Bundlers normally require dozens or even hundreds of lines of configuration, but with Snowpack it's just a one-line plugin with no config required. This is possible because Snowpack builds your application _before_ sending it to the bundler, so the bundler never sees your custom source code (JSX, TS, Svelte, Vue, etc.) and instead only needs to worry about building common HTML, CSS, and JS.

```js
// Bundlers plugins are pre-configured to work with Snowpack apps.
// No config required!
{
  "plugins": [["@snowpack/plugin-webpack"]]
}
```

See ["Optimized Builds"](/#optimized-builds) for more information about connecting bundled (or unbundled) optimization plugins for your production builds.
## JavaScript

### ES Modules (ESM)

Snowpack was designed to support JavaScript's native ES Module (ESM) syntax. ESM lets you define explicit imports & exports that browsers and build tools can better understand and optimize for. If you're familiar with the `import` and `export` keywords in JavaScript, then you already know ESM!

```js
// ESM Example - src/user.js
export function getUser() {
  /* ... */
}

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

All other assets not explicitly mentioned above can be imported via ESM `import` and will return a URL reference to the final built asset. This can be useful for referencing non-JS assets by URL, like creating an image element with a `src` attribute pointing to that image.

#### Coming Soon: Native Reference URLs

Webpack 5.0 released support for native reference URLs to replace the original, fake ESM file import. If you are using a bundler that supports this (or, not using a bundler at all) we recommend updating your non-JS URL reference imports to use this more standard pattern. Once Rollup adds support as well, we will move to promote this to our recommended style.

```jsx
const img = new URL('./image.png', import.meta.url); // img === '/src/image.png'
const svg = new URL('./image.svg', import.meta.url); // svg === '/src/image.svg'

// This example uses JSX, but you can use these references with any framework.
<img src={img.href} />;
```

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

You can use environment variables in HTML files. All occurrences of `%SNOWPACK_PUBLIC_*%`, `%PUBLIC_URL%`, and `%MODE%` will be replaced at build time.

**Remember:** that these env variables are statically injected into your application for everyone at **build time**, and not runtime.

#### `.env` File Support

```js
// snowpack.config.json
{
  "plugins": ["@snowpack/plugin-dotenv"]
}
```

Add the `@snowpack/plugin-dotenv` plugin to your dev environment to automatically load environment variables from your project `.env` files. Visit the [plugin README](https://github.com/snowpackjs/snowpack/tree/master/plugins/plugin-dotenv) to learn more.

### Hot Module Replacement

Hot Module Replacement (HMR) is the ability to update your web app during development without refreshing the page. Imagine changing some CSS, hitting save, and then instantly seeing your change reflected on the page without a refresh. That's HMR.

Snowpack supports full HMR out-of-the-box for the following served files:

- CSS
- CSS Modules
- JSON

Popular frameworks can also be set up for HMR. **[Create Snowpack App (CSA)](https://github.com/snowpackjs/snowpack/blob/master/create-snowpack-app) ships with HMR enabled by default for all of the following frameworks.** If you're not using CSA, you can setup HMR in your application with a simple plugin or a few lines of code:

- Preact: [@prefresh/snowpack](https://www.npmjs.com/package/@prefresh/snowpack)
- React: [@snowpack/plugin-react-refresh](https://www.npmjs.com/package/@snowpack/plugin-react-refresh)
- Svelte: [A few lines of code](https://github.com/snowpackjs/snowpack/blob/master/create-snowpack-app/app-template-svelte/src/index.js#L9-L16)
- Vue: [A few lines of code](https://github.com/snowpackjs/snowpack/blob/master/create-snowpack-app/app-template-vue/src/index.js#L7-L14)

For more advanced, bare-metal HMR integrations, Snowpack created [ESM-HMR](https://github.com/snowpackjs/esm-hot-module-replacement-spec), a standard HMR API for any ESM-based dev environment. Any HMR integration built for ESM-HMR will run on Snowpack and any other ESM-HMR-enabled dev server. To use the HMR API directly (via `import.meta.hot`) check out [the ESM-HMR spec](https://github.com/snowpackjs/esm-hot-module-replacement-spec) to learn more.

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

- 👉 **[Check out the full ESM-HMR spec.](https://github.com/snowpackjs/esm-hot-module-replacement-spec)**

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

See the [config.proxy API](#config.proxy) section for more information and full set of configuration options.

### HTTPS/HTTP2

```
npm start -- --secure
```

Snowpack provides an easy way to use a local HTTPS server during development through the use of the `--secure` flag. When enabled, Snowpack will look for a `snowpack.key` and `snowpack.crt` file in the root directory and use that to create an HTTPS server with HTTP2 support enabled.

#### Generating SSL Certificates

You can automatically generate credentials for your project via either:

- [devcert (no install required)](https://github.com/davewasmer/devcert-cli): `npx devcert-cli generate localhost`
- [mkcert (install required)](https://github.com/FiloSottile/mkcert): `mkcert -install && mkcert -key-file snowpack.key -cert-file snowpack.crt localhost`

In most situations you should add personally generated certificate files (`snowpack.key` and `snowpack.crt`) to your `.gitignore` file.

### Legacy Browser Support

You can customize the set of browsers you'd like to support via the `package.json` "browserslist" property, going all the way back to IE11. This will be picked up when you run `snowpack build` to build for production.

```js
/* package.json */
"browserslist": ">0.75%, not ie 11, not UCAndroid >0, not OperaMini all",
```

If you're worried about legacy browsers, you should also add a bundler to your production build. Check out our [section on bundling for production](#bundle-for-production) for more info.

Note: During development (`snowpack dev`) we perform no transpilation for older browsers. Make sure that you're using a modern browser during development.

### Node.js Polyfills

If you depend on packages that depend on Node.js built-in modules (`"fs"`, `"path"`, `"url"`, etc.) you can run Snowpack with `--polyfill-node` (or `installOptions.polyfillNode: true` in your config file). This will automatically polyfill any Node.js dependencies as much as possible for the browser. You can see the full list of supported polyfills here: https://github.com/ionic-team/rollup-plugin-node-polyfills

If you'd like to customize this polyfill behavior, skip the `--polyfill-node` flag and instead provide your own Rollup plugin for the installer:

```js
// Example: If `--polyfill-node` doesn't support your use-case, you can provide your own custom Node.js polyfill behavior
module.exports = {
  installOptions: {
    polyfillNode: false,
    rollup: {
      plugins: [require('rollup-plugin-node-polyfills')({crypto: true, ...})],
    },
  },
};
```

### CSS Imports (@import)

```css
/* Import a local CSS file */
@import './style1.css';
/* Import a local Sass file (Sass build plugin still needed to compile file contents) */
@import './style2.scss';
/* Import a package CSS file */
@import 'bootstrap/dist/css/bootstrap.css';
```

Snowpack supports [native CSS "@import" behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/@import) with additional support for importing CSS from within packages.

**Note:** The actual CSS spec dictates that a "bare" import specifier like `@import "package/style.css"` should be treated as a relative path, equivalent to `@import "./package/style.css"`. We intentionally break from the spec to match the same package import behavior as JavaScript imports. If you prefer the strictly native behavior with no package resolution support, use the form `@import url("package/style.css")` instead. Snowpack will not resolve `url()` imports and will leave them as-is in the final build.

**Note for webpack users:** If you're migrating an existing app to snowpack, note that `@import '~package/...'` (URL starting with a tilde) is a syntax specific to webpack. With Snowpack you remove the `~` from your `@import`s.

### Server Side Rendering (SSR)

SSR for Snowpack is supported but fairly new and experimental. This documentation will be updated as we finalize support over the next few minor versions.

```js
// New in Snowpack v2.15.0 - JS API Example
import {startDevServer} from 'snowpack';
const server = await startDevServer({ ... });
```

These frameworks have known experiments / examples of using SSR + Snowpack:

- React (Example): https://github.com/matthoffner/snowpack-react-ssr
- Svelte/Sapper (Experiment): https://github.com/Rich-Harris/snowpack-svelte-ssr
- [Join our Discord](https://discord.gg/rS8SnRk) if you're interested in getting involved!

### Optimized Builds

By default, Snowpack doesn't optimize your code for production. But, there are several plugins available to optimize your final build, including minification (reducing file sizes) and even bundling (combining files together to reduce the number of requests needed).

**Connect the `@snowpack/plugin-optimize` plugin to optimize your build.** By default this will minify your built files for faster loading. It can also be configured to add `<link ref="modulepreload" />` elements that will improve the loading speed of unbundled sites. _Note: this plugin replaces `buildOptions.minify`._

```js
// snowpack.config.json
// [npm install @snowpack/plugin-optimize]
{
  "plugins": [
    ["@snowpack/plugin-optimize", {/* ... */}]
  ]
}
```

Note that `@snowpack/plugin-optimize` will optimize your build, but won't bundle files together.

**If you'd like a bundled build, use `@snowpack/plugin-webpack` instead.** Connect the `"@snowpack/plugin-webpack"` plugin in your Snowpack configuration file and then run `snowpack build` to see your optimized, _bundled_ build.

```js
// snowpack.config.json
// [npm install @snowpack/plugin-webpack]
{
  "plugins": [["@snowpack/plugin-webpack", {/* ... */}]]
}
```

### Testing

Snowpack supports any popular JavaScript testing framework that you're already familiar with. Mocha, Jest, Jasmine, AVA and Cypress are all supported in Snowpack applications.

We currently recommend [@web/test-runner](https://www.npmjs.com/package/@web/test-runner) (WTR) for testing in Snowpack projects. When benchmarked it performed faster than Jest (our previous recommendation) while also providing an environment for testing that more closely matches the actual browser that your project runs in. Most importantly, WTR runs the same Snowpack build pipeline that you've already configured for your project, so there's no extra build configuration needed to run your tests. Jest (and many others) ask you to configure a totally secondary build pipeline for your tests, which reduces test confidence while adding 100s of extra dependencies to your project.

To use [@web/test-runner](https://www.npmjs.com/package/@web/test-runner) in your project, [follow the instructions here](https://modern-web.dev/docs/test-runner/overview/) and make sure that you add the Snowpack plugin to your config file:

```js
// web-test-runner.config.js
module.exports = {
  plugins: [require('@snowpack/web-test-runner-plugin')()],
};
```

[See an example setup](https://github.com/snowpackjs/snowpack/blob/master/create-snowpack-app/app-template-react) in on of our Create Snowpack App starter templates.
## Plugins

Snowpack isn't just a build tool for JavaScript, it is a build tool for your entire website. Babel, TypeScript, PostCSS, SVGR and any favorite build tool can be connected directly into Snowpack via 1-line plugins.

Snowpack plugins can be added to:

- Customize your build with new language/framework support (Svelte, Vue)
- Customize your build with new build tools (Babel, PostCSS)
- Run CLI commands during build and development (TypeScript, ESLint)
- Create custom transformations, specific to your exact application.

👉 **[Check out our advanced guide](/plugins) and learn how to create your own plugin.**

### Connect a Plugin

To make a plugin available, you have to put it in your project `devDependencies` list (`package.json`) which will install it locally (in your project) and make it available to snowpack.

For the official snowpack plugins, command would look like:

```bash
# for npm
npm install --save-dev @snowpack/[plugin-name]
# for yarn
yarn add --dev @snowpack/[plugin-name]
```

After that, you can connect the plugin to Snowpack via the `"plugins"` array in your Snowpack config. For example,

```js
// snowpack.config.json
{
  "plugins": ["@snowpack/plugin-babel"]
}
```

This is all you need to add Babel to your application build pipeline. If the plugin supports it, you can also pass **options** to the plugin to configure its behavior:

```js
// snowpack.config.json
{
  "plugins": [
    ["@snowpack/plugin-babel", { /* ... */}]
  ],
}
```

NOTE: The **order** of plugins is important, for example, if there are multiple plugins that load/build particular type of file, the first matching will take precedence. If it succeeds in the build task for the file, others will not be called for that particular build task.

### Connect any Script/CLI

If you can't find a plugin that fits your needs and don't want to write your own, you can also run CLI commands directly as a part of your build using one of our two utility plugins: `@snowpack/plugin-build-script` & `@snowpack/plugin-run-script`.

#### @snowpack/plugin-build-script

```js
// snowpack.config.json
// [npm install @snowpack/plugin-build-script]
{
  "plugins": [
    ["@snowpack/plugin-build-script", { "cmd": "postcss", "input": [".css"], "output": [".css"]}]
  ],
}
```

This plugin allows you to connect any CLI into your build process. Just give it a `cmd` CLI command that can take input from `stdin` and emit the build result via `stdout`. Check out the README for more information.

#### @snowpack/plugin-run-script

```js
// snowpack.config.json
// [npm install @snowpack/plugin-run-script]
{
  "plugins": [
    ["@snowpack/plugin-run-script", { "cmd": "eleventy", "watch": "$1 --watch" }]
  ],
}
```

This plugin allows you to run any CLI command as a part of your dev and build workflow. This plugin doesn't affect your build output, but it is useful for connecting developer tooling directly into Snowpack. Use this to add meaningful feedback to your dev console as you type, like TypeScript type-checking and ESLint lint errors.

### Official Plugins

- [@snowpack/plugin-babel](https://github.com/snowpackjs/snowpack/tree/master/plugins/plugin-babel)
- [@snowpack/plugin-dotenv](https://github.com/snowpackjs/snowpack/tree/master/plugins/plugin-dotenv)
- [@snowpack/plugin-postcss](https://github.com/snowpackjs/snowpack/tree/master/plugins/plugin-postcss)
- [@snowpack/plugin-react-refresh](https://github.com/snowpackjs/snowpack/tree/master/plugins/plugin-react-refresh)
- [@snowpack/plugin-svelte](https://github.com/snowpackjs/snowpack/tree/master/plugins/plugin-svelte)
- [@snowpack/plugin-vue](https://github.com/snowpackjs/snowpack/tree/master/plugins/plugin-vue)
- [@snowpack/plugin-webpack](https://github.com/snowpackjs/snowpack/tree/master/plugins/plugin-webpack)

👉 **[Check out our full list](/plugins) of official plugins.**

### Community Plugins

- [snowpack-plugin-mdx](https://www.npmjs.com/package/snowpack-plugin-mdx)
- [snowpack-plugin-stylus](https://www.npmjs.com/package/snowpack-plugin-stylus)
- [snowpack-plugin-import-map](https://github.com/zhoukekestar/snowpack-plugin-import-map)

👉 **[Find your community plugin on npm.](https://www.npmjs.com/search?q=keywords:snowpack%20plugin)**
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

### JSX

Snowpack has built-in support to handle `.jsx` & `.tsx` source files in your application.

**Note: Snowpack's default build does not support JSX in `.js`/`.ts` files.** If you can't use the `.jsx`/`.tsx` file extension, you can use [Babel](#babel) to build your application instead.

### TypeScript

Snowpack includes built-in support to build all TypeScript source files (`.ts` & `.tsx`) in your application.

For automatic TypeScript type checking during development, add the official [@snowpack/plugin-typescript](https://www.npmjs.com/package/@snowpack/plugin-typescript) plugin to your Snowpack config file. This plugin adds automatic `tsc` type checking results right in the Snowpack dev console.

```js
// snowpack.config.json
"plugins": ["@snowpack/plugin-typescript"]
```

### Babel

Snowpack already comes with built-in support for building JavaScript, TypeScript, and JSX. However, If you would like to run your build through Babel instead, you can replace our default file builder with the official Snowpack Babel plugin.

The plugin will automatically read plugins & presets from your local project `babel.config.*` config file, if one exists.

```js
// snowpack.config.json
"plugins": ["@snowpack/plugin-babel"],
```

### Preact

You can import and use Preact without any custom configuration needed.

**To use `preact/compat`:** (the Preact+React compatability layer) alias the "compat" package to React in your install options:

```js
// Example: Lets you import "react" in your application, but uses preact internally
// snowpack.config.json
"installOptions": {
  "alias": {
    "react": "preact/compat",
    "react-dom": "preact/compat"
  }
}
```

### Vue

```js
// snowpack.config.json
"plugins": ["@snowpack/plugin-vue"]
```

### Svelte

```js
// snowpack.config.json
"plugins": ["@snowpack/plugin-svelte"]
```

### PostCSS

```js
// snowpack.config.json
"plugins": [
  ["@snowpack/plugin-build-script", {"cmd": "postcss", "input": [".css"], "output": [".css"]}]
]
```

The [`postcss-cli`](https://github.com/postcss/postcss-cli) package must be installed manually. You can configure PostCSS with a `postcss.config.js` file in your current working directory.

### Tailwind CSS

You can add [Tailwind](https://tailwindcss.com) to any project via native CSS `@import`:

```css
/* index.css */
@import 'tailwindcss/dist/base.css';
@import 'tailwindcss/dist/components.css';
@import 'tailwindcss/dist/utilities.css';
```

#### Using Tailwind with PostCSS

If you are using PostCSS in your project ([see above](#postcss)) then you can just add Tailwind as a plugin to your `postcss.config.js`:

```js
// postcss.config.js
// Taken from: https://tailwindcss.com/docs/installation#using-tailwind-with-postcss
module.exports = {
  plugins: [
    // ...
    require('tailwindcss'),
    require('autoprefixer'),
    // ...
  ],
};
```

Once you have added the Tailwind PostCSS plugin, you can replace your native CSS `dist` imports with Tailwind's more powerful `base`, `components`, and `utilities` imports:

```diff
/* index.css */
- @import 'tailwindcss/dist/base.css';
- @import 'tailwindcss/dist/components.css';
- @import 'tailwindcss/dist/utilities.css';
+ @import 'tailwindcss/base';
+ @import 'tailwindcss/components';
+ @import 'tailwindcss/utilities';
```

Follow the official [Tailwind CSS Docs](https://tailwindcss.com/docs/installation/#using-tailwind-with-postcss) for more information.

### Sass

```js
// snowpack.config.json
"plugins": ["@snowpack/plugin-sass"]
```

[Sass](https://www.sass-lang.com/) is a stylesheet language that’s compiled to CSS. It allows you to use variables, nested rules, mixins, functions, and more, all with a fully CSS-compatible syntax. Sass helps keep large stylesheets well-organized and makes it easy to share design within and across projects.

To use Sass + PostCSS, check out [this guide](https://zellwk.com/blog/eleventy-snowpack-sass-postcss/).

### ESLint

```js
// snowpack.config.json
"plugins": [
  ["@snowpack/plugin-run-script", {
    "cmd": "eslint 'src/**/*.{js,jsx,ts,tsx}'",
    // Optional: Use npm package "watch" to run on every file change
    "watch": "watch \"$1\" src"
  }]
]
```

### Webpack

```js
// snowpack.config.json
{
  // Optimize your production builds with Webpack
  "plugins": [["@snowpack/plugin-webpack", {/* ... */}]]
}
```

Snowpack ships an official [webpack plugin](https://www.npmjs.com/package/@snowpack/plugin-webpack) for optimizing your build. Connect the `"@snowpack/plugin-webpack"` plugin into your Snowpack configuration file and then run `snowpack build` to see your optimized, bundled build.

See ["Optimized Builds"](/#optimized-builds) for more information about connecting bundled (or unbundled) optimization plugins for your production builds.

### Workbox

The [Workbox CLI](https://developers.google.com/web/tools/workbox/modules/workbox-cli) integrates well with Snowpack. Run the wizard to bootstrap your first configuration file, and then run `workbox generateSW` to generate your service worker.

Remember that Workbox expects to be run every time you deploy, as a part of a production build process. If you don't have one yet, create package.json [`"deploy"` and/or `"build"` scripts](https://michael-kuehnel.de/tooling/2018/03/22/helpers-and-tips-for-npm-run-scripts.html) to automate your production build process.

### @web/test-runner

[@web/test-runner](https://www.npmjs.com/package/@web/test-runner) is our recommended test runner for Snowpack projects. [See our section on testing](/#testing) for detailed instructions on how to get started with @web/test-runner.

### Jest

> Update (October 11, 2020): **We now recommend [@web/test-runner](https://www.npmjs.com/package/@web/test-runner) as our test runner of choice for Snowpack projects.** [See our section on testing](/#testing) for more background behind the change.

[Jest](https://jestjs.io/) is a popular Node.js test runner for Node.js & web projects. Jest can be used with any frontend project as long as you configure how Jest should build your frontend files to run on Node.js. Many projects will try to manage this configuration for you, since it can get complicated.

Snowpack ships pre-built Jest configuration files for several popular frameworks. If you need to use Jest for any reason,consider extending one of these packages:

- React: [@snowpack/app-scripts-react](https://www.npmjs.com/package/@snowpack/app-scripts-react)
- Preact: [@snowpack/app-scripts-preact](https://www.npmjs.com/package/@snowpack/app-scripts-preact)
- Svelte: [@snowpack/app-scripts-svelte](https://www.npmjs.com/package/@snowpack/app-scripts-svelte)

You can use these packages in your project like so:

```js
// jest.config.js
// Example: extending a pre-built Jest configuration file
module.exports = {
  ...require('@snowpack/app-scripts-preact/jest.config.js')(),
};
```

### Server Side Rendering (SSR)

To connect your own server to `snowpack dev` for SSR, there are a few things that you'll need to set up. Make sure that you include any Snowpack-built resources via script tags in your server's HTML response:

```html
<!-- Example: Create Snowpack App builds your src/ directory to the /_dist_/* directory -->
<script type="module" src="http://localhost:8080/_dist_/index.js"></script>
```

And make sure that your HTML response also includes code to configure HMR to talk to Snowpack's dev server:

```html
<!-- Configure Snowpack's HMR connection yourself, somewhere on your page HTML -->
<script>
  window.HMR_WEBSOCKET_URL = 'ws://localhost:8080';
</script>
```

### Leaving Snowpack

Snowpack is designed for zero lock-in. If you ever feel the need to add a traditional application bundler to your stack (for whatever reason!) you can do so in seconds.

Any application built with Snowpack should Just Work™️ when passed through Webpack/Rollup/Parcel. If you are already importing packages by name in your source code (ex: `import React from 'react'`) then you should be able to migrate to any popular bundler without issue.

If you are importing packages by full URL (ex: `import React from '/web_modules/react.js'`), then a simple Find & Replace should help you re-write them to the plain package name imports that most bundlers expect.
## Troubleshooting

### No such file or directory

```
ENOENT: no such file or directory, open …/node_modules/csstype/index.js
```

This error message would sometimes occur in older versions of Snowpack.

**To solve this issue:** Upgrade to Snowpack `v2.6.0` or higher. If you continue to see this unexpected error in newer versions of Snowpack, please file an issue.

### Package exists but package.json "exports" does not include entry

Node.js recently added support for a package.json "exports" entry that defines which files you can and cannot import from within a package. Preact, for example, defines an "exports" map that allows you to to import "preact/hooks" but not "preact/some/custom/file-path.js". This allows packages to control their "public" interface.

If you see this error message, that means that you've imported a file path not allowed in the export map. If you believe this to be an error, reach out to the package author to request the file be added to their export map.

### Uncaught SyntaxError: The requested module '/web_modules/XXXXXX.js' does not provide an export named 'YYYYYY'

This is usually seen when importing a named export from a package written in the older Common.js format. Snowpack will automatically scan legacy Common.js packages to detect its named exports, but sometimes these exports can't be detected statically.

**To solve this issue:** Add a ["namedExports"](#config.installoptions) entry in your Snowpack config file. This tells Snowpack to use a more-powerful runtime scanner on this legacy Common.js package to detect it's exports at runtime.

```json
// snowpack.config.json
// Example: add support for `import { Terminal } from 'xterm';`
"installOptions": {
  "namedExports": ["xterm"]
}
```

### Installing Non-JS Packages

When installing packages from npm, you may encounter some file formats that can only run with additional parsing/processing. First check to see if there is a [Snowpack plugin for the type of file](#plugins).

Because our internal installer is powered by Rollup, you can also add Rollup plugins to your [Snowpack config](#configuration) to handle these special, rare files:

```js
/* snowpack.config.js */
module.exports = {
  rollup: {
    plugins: [require('rollup-plugin-sass')()],
  },
};
```

Refer to [Rollup’s documentation on plugins](https://rollupjs.org/guide/en/#using-plugins) for more information.
## API Reference

### Config Files

Snowpack's behavior can be configured by CLI flags, a custom Snowpack config file, or both. [See the api reference below for the full list of supported options](#api-reference).

Snowpack supports configuration files in multiple formats, sorted by priority order:

1. `--config [path]`: If provided.
1. `package.json`: A namespaced config object (`"snowpack": {...}`).
1. `snowpack.config.cjs`: (`module.exports = {...}`) for projects using `"type": "module"`.
1. `snowpack.config.js`: (`module.exports = {...}`).
1. `snowpack.config.ts`\*: (`export default {...}`).
1. `snowpack.config.json`: (`{...}`).

_(\* Note: `snowpack.config.ts` support is still experimental! It currently involves bundling your config file and all imported files into a temporary JS config file that can be loaded by Node.js. Your mileage may vary.)_

### CLI Flags

```bash
# Show helpful info
$ snowpack --help

# Show additional debugging logs
$ snowpack --verbose

# {installOptions: {dest: 'CUSTOM_DIR/'}}
$ snowpack install --dest CUSTOM_DIR/

# {devOptions: {bundle: true}}
$ snowpack dev --bundle

# {devOptions: {bundle: false}}
$ snowpack dev --no-bundle

# {buildOptions: {clean: true}}
$ snowpack build --clean
```

**CLI flags will be merged with (and take priority over) your config file values.** Every config value outlined below can also be passed as a CLI flag. Additionally, Snowpack also supports the following flags:

- **`--config [path]`** Set the path to your project config file.
- **`--help`** Show this help.
- **`--version`** Show the current version.
- **`--reload`** Clear the local cache. Useful for troubleshooting installer issues.

### Configuration

Example:

```js
{
  "install": [
    "htm",
    "preact",
    "preact/hooks", // A package within a package
    "unistore/full/preact.es.js", // An ESM file within a package (supports globs)
    "bulma/css/bulma.css" // A non-JS static asset (supports globs)
  ],
  "plugins": [ /* ... */ ],
  "installOptions": { /* ... */ },
  "devOptions": { /* ... */ },
  "buildOptions": { /* ... */ },
  "proxy": { /* ... */ },
  "mount": { /* ... */ },
  "alias": { /* ... */ }
}
```

#### `config`

`object` (options)

See the configuration section for information on file formats and command line usage.

Example:

```js
{
  mount: {
    public: '/',
    src: '/_dist_',
  },
  plugins: ['@snowpack/plugin-babel', '@snowpack/plugin-dotenv'],
  devOptions: {},
  installOptions: {
    installTypes: isTS,
  },
}
```

Options:

- **`extends`** | `string`
  - Inherit from a separate "base" config. Can be a relative file path, an npm package, or a file within an npm package. Your configuration will be merged on top of the extended base config.
- **`exclude`** | `string[]`
  - Exclude any files from scanning, building, etc. Defaults to exclude common test file locations: `['**/node_modules/**/*', '**/__tests__/*', '**/*.@(spec|test).@(js|mjs)']`
  - Useful for excluding tests and other unnecessary files from the final build. Supports glob pattern matching.
- **`install`** | `string[]`
  - Known dependencies to install with Snowpack. Useful for installing packages manually and any dependencies that couldn't be detected by our automatic import scanner (ex: package CSS files).
- **`mount.*`**
  - Mount local directories to custom URLs in your built application.
- **`alias.*`**
  - Configure import aliases for directories and packages. See the section below for all options.
- **`proxy.*`**
  - Configure the dev server to proxy requests. See the section below for all options.
- **`plugins`**
  - Extend Snowpack with third-party tools and plugins. See the section below for more info.
- **`installOptions.*`**
  - Configure how npm packages are installed. See the section below for all options.
- **`devOptions.*`**
  - Configure your dev server. See the section below for all options.
- **`buildOptions.*`**
  - Configure your build. See the section below for all options.
- **`testOptions.*`**
  - Configure your tests. See the section below for all options.

#### `config.installOptions`

`object` (options)

Settings that determine how Snowpack handles installing modules.

Example:

```js
installOptions: {
  installTypes: isTS,
}
```

Options:

- **`installOptions.dest`** | `string`
  - _Default:`"web_modules"`_
  - Configure the install directory.
- **`installOptions.sourceMap`** | `boolean`
  - Emit source maps for installed packages.
- **`installOptions.env`** | `{[ENV_NAME: string]: (string | true)}`
  - Sets a `process.env.` environment variable inside the installed dependencies. If set to true (ex: `{NODE_ENV: true}` or `--env NODE_ENV`) this will inherit from your current shell environment variable. Otherwise, set to a string (ex: `{NODE_ENV: 'production'}` or `--env NODE_ENV=production`) to set the exact value manually.
- **`installOptions.treeshake`** | `boolean`
  - _Default:`false`, or `true` when run with `snowpack build`_
  - Treeshake your dependencies to optimize your installed files. Snowpack will scan your application to detect which exact imports are used from each package, and then will remove any unused imports from the final install via dead-code elimination (aka tree shaking).
- **`installOptions.installTypes`** | `boolean`
  - Install TypeScript type declarations with your packages. Requires changes to your [tsconfig.json](#typescript) to pick up these types.
- **`installOptions.alias`** | `{[mapFromPackageName: string]: string}`
  - Alias an installed package name. This applies to imports within your application and within your installed dependency graph.
  - Example: `"alias": {"react": "preact/compat", "react-dom": "preact/compat"}`
- **`installOptions.namedExports`** | `string[]`
  - _NOTE(v2.13.0): Snowpack now automatically supports named exports for most Common.js packages. This configuration remains for any package that Snowpack can't handle automatically. In most cases, this should no longer be needed._
  - Import CJS packages using named exports (Example: `import {useTable} from 'react-table'`).
  - Example: `"namedExports": ["react-table"]`
- **`installOptions.externalPackage`** | `string[]`
  - _NOTE: This is an advanced feature, and may not do what you want! Bare imports are not supported in any major browser, so an ignored import will usually fail when sent directly to the browser._
  - Mark some imports as external. Snowpack won't install them and will ignore them when resolving imports.
  - Example: `"externalPackage": ["fs"]`
- **`installOptions.rollup`** | `Object`
  - Snowpack uses Rollup internally to install your packages. This `rollup` config option gives you deeper control over the internal rollup configuration that we use.
  - **`installOptions.rollup.plugins`** - Specify [Custom Rollup plugins](#installing-non-js-packages) if you are dealing with non-standard files.
  - **`installOptions.rollup.dedupe`** - If needed, deduplicate multiple versions/copies of a packages to a single one. This helps prevent issues with some packages when multiple versions are installed from your node_modules tree. See [rollup-plugin-node-resolve](https://github.com/rollup/plugins/tree/master/packages/node-resolve#usage) for more documentation.
  - **`installOptions.rollup.context`** - Specify top-level `this` value. Useful to silence install errors caused by legacy common.js packages that reference a top-level this variable, which does not exist in a pure ESM environment. Note that the `'THIS_IS_UNDEFINED'` warning (`The 'this' keyword is equivalent to 'undefined' at the top level of an ES module, and has been rewritten`) is silenced by default, unless `--verbose` is used.

#### `config.devOptions`

`object` (options)

Settings that determine how the Snowpack dev environment behaves.

Example:

```js
devOptions: {
	port: 4000,
	open: "none",
}
```

Options:

- **`devOptions.port`** | `number` | Default: `8080`
  - The port number to run the dev server on.
- **`devOptions.bundle`** | `boolean`
  - Create an optimized, bundled build for production.
  - You must have [Parcel](https://parceljs.org/) as a dev dependency in your project.
  - If undefined, this option will be enabled if the `parcel` package is found.
- **`devOptions.fallback`** | `string` | Default: `"index.html"`
  - When using the Single-Page Application (SPA) pattern, this is the HTML "shell" file that gets served for every (non-resource) user route. Make sure that you configure your production servers to serve this as well.
- **`devOptions.open`** | `string` | Default: `"default"`
  - Opens the dev server in a new browser tab. If Chrome is available on macOS, an attempt will be made to reuse an existing browser tab. Any installed browser may also be specified. E.g., "chrome", "firefox", "brave". Set "none" to disable.
- **`devOptions.output`** | `"stream" | "dashboard"` | Default: `"dashboard"`
  - Set the output mode of the `dev` console.
  - `"dashboard"` delivers an organized layout of console output and the logs of any connected tools. This is recommended for most users and results in the best logging experience.
  - `"stream"` is useful when Snowpack is run in parallel with other commands, where clearing the shell would clear important output of other commands running in the same shell.
- **`devOptions.hostname`** | `string` | Default: `localhost`
  - The hostname where the browser tab will be open.
- **`devOptions.hmr`** | `boolean` | Default: `true`
  - Toggles whether or not Snowpack dev server should have HMR enabled.
- **`devOptions.hmrErrorOverlay`** | `boolean` | Default: `true`
  - When HMR is enabled, toggles whether or not a browser overlay should display javascript errors.
- **`devOptions.secure`** | `boolean`
  - Toggles whether or not Snowpack dev server should use HTTPS with HTTP2 enabled.
- **`devOptions.out`** | `string` | Default: `"build"`
  - _NOTE:_ Deprecated, see `buildOptions.out`.
  - The local directory that we output your final build to.

#### `config.buildOptions`

`object` (options)

Determines how Snowpack processes the final build.

Example:

```js
buildOptions: {
  sourceMaps: true,
  baseUrl: '/home',
  metaDir: 'static/snowpack',
  webModulesUrl: 'web'
}
```

Options:

- **`buildOptions.out`** | `string` | Default: `"build"`
  - The local directory that we output your final build to.
- **`buildOptions.baseUrl`** | `string` | Default: `/`
  - In your HTML, replace all instances of `%PUBLIC_URL%` with this (inspired by the same [Create React App](https://create-react-app.dev/docs/using-the-public-folder/) concept). This is useful if your app will be deployed to a subdirectory. _Note: if you have `homepage` in your `package.json`, Snowpack will actually pick up on that, too._
- **`buildOptions.clean`** | `boolean` | Default: `false`
  - Set to `true` if Snowpack should erase the build folder before each build.
- **`buildOptions.metaDir`** | `string` | Default: `__snowpack__`
  - By default, Snowpack outputs Snowpack-related metadata such as [HMR](#hot-module-replacement) and [ENV](#environment-variables) info to a folder called `__snowpack__`. You can rename that folder with this option (e.g.: `metaDir: 'static/snowpack'`).
- **`buildOptions.sourceMaps`** | `boolean` | Default: `false`
  - **_Experimental:_** Set to `true` to enable source maps
- **`buildOptions.webModulesUrl`** | `string` | Default: `web_modules`
  - Rename your web modules directory.

#### `config.testOptions`

`object` (options)

Settings that determine how the Snowpack test environment behaves.

Example:

```js
testOptions: {
  files: ['my-test-dir/*.test.js'];
}
```

Options:

- **`testOptions.files`** | `string[]` | Default: `["__tests__/**/*", "**/*.@(spec|test).*"]`
  - The location of all test files.
  - All matching test files are scanned for installable dependencies during development, but excluded from both scanning and building in your final build.

#### `config.proxy`

`object` (path: options)

If desired, `"proxy"` is where you configure the proxy behavior of your dev server. Define different paths that should be proxied, and where they should be proxied to.

The short form of a full URL string is enough for general use. For advanced configuration, you can use the object format to set all options supported by [http-proxy](https://github.com/http-party/node-http-proxy).

This configuration has no effect on the final build.

Example:

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

Options:

- **`"path".on`** | `object` (string: function)
  - `on` is a special Snowpack property for setting event handler functions on proxy server events. See the section on ["Listening for Proxy Events"](https://github.com/http-party/node-http-proxy#listening-for-proxy-events) for a list of all supported events. You must be using a `snowpack.config.js` JavaScript configuration file to set this.
- All options supported by [http-proxy](https://github.com/http-party/node-http-proxy).

#### `config.mount`

```
mount: {
  [path: string]: string | {url: string, static: boolean, resolve: boolean}
}
```

The `mount` configuration lets you customize which directories should be included in your Snowpack build, and what URL they are mounted to. Given the following example configuration, you could expect the following results:

```js
// Example: Basic "mount" usage
// snowpack.config.json
{
  "mount": {
    "src": "/_dist_",
    "public": "/"
  }
}
```

```
GET /src/a.js           -> 404 NOT FOUND ("./src" is mounted to "/_dist_/*", not "/src/*")
GET /_dist_/a.js        -> ./src/a.js
GET /_dist_/b/b.js      -> ./src/b/b.js
GET /public/robots.txt  -> 404 NOT FOUND ("./public" dir is mounted to "/*", not "/public/*")
GET /robots.txt         -> ./public/robots.txt
```

By default, Snowpack builds every mounted file by passing it through Snowpack's build pipeline.

**\*New in Snowpack `v2.15.0`:** You can customize the build behavior for a mounted directory using the expanded object notation:

- `url` _required_: The URL to mount to, matching the simple form above.
- `static` _optional, default: false_: If true, don't build files in this directory and serve them directly to the browser.
- `resolve` _optional, default: true_: If false, don't resolve JS & CSS imports in your JS, CSS, and HTML files and send every import to the browser, as written. We recommend that you don't disable this unless absolutely necessary, since it prevents Snowpack from handling your imports to things like packages, JSON files, CSS modules, and more.

```js
// Example: Advanced "mount" usage
// snowpack.config.json
{
  "mount": {
    // Same behavior as the "src" example above:
    "src": {url: "/_dist_"},
    // Mount "public" to the root URL path ("/*") and serve files with zero transformations:
    "public": {url: "/", static: true, resolve: false}
  }
}
```

#### `config.alias`

`object` (package: package or path)

> Note: In an older version of Snowpack, all mounted directories were also available as aliases by default. As of Snowpack 2.7, this is no longer the case and no aliases are defined by default.

The `alias` config option lets you define an import alias in your application. When aliasing a package, this allows you to import that package by another name in your application. This applies to imports inside of your dependencies as well, essentially replacing all references to the aliased package.

Aliasing a local directory (any path that starts with "./") creates a shortcut to import that file or directory. While we don't necessarily recommend this pattern, some projects do enjoy using these instead of relative paths:

```diff
-import '../../../../../Button.js';
+import '@app/Button.js';
```

Example:

```js
// snowpack.config.json
{
  alias: {
    // Type 1: Package Import Alias
    "lodash": "lodash-es",
    "react": "preact/compat",
    // Type 2: Local Directory Import Alias (relative to cwd)
    "components": "./src/components"
    "@app": "./src"
  }
}
```
## Assets

- [Snowpack Logo (PNG, White)](/assets/snowpack-logo-white.png)
- [Snowpack Logo (PNG, Dark)](/assets/snowpack-logo-dark.png)
- [Snowpack Logo (PNG, Black)](/assets/snowpack-logo-black.png)
- [Snowpack Wordmark (PNG, White)](/assets/snowpack-wordmark-white.png)
- [Snowpack Wordmark (PNG, Black)](/assets/snowpack-wordmark-black.png)
