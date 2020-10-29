---
layout: layouts/main.njk
home: true

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
import { getUser } from './user.js';
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
  import.meta.hot.accept(({ module }) => {
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

### Leaving Snowpack

Snowpack is designed for zero lock-in. If you ever feel the need to add a traditional application bundler to your stack (for whatever reason!) you can do so in seconds.

Any application built with Snowpack should Just Work™️ when passed through Webpack/Rollup/Parcel. If you are already importing packages by name in your source code (ex: `import React from 'react'`) then you should be able to migrate to any popular bundler without issue.

If you are importing packages by full URL (ex: `import React from '/web_modules/react.js'`), then a simple Find & Replace should help you re-write them to the plain package name imports that most bundlers expect.
