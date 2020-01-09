## Guides

Snowpack dramatically speeds up your development time by removing the need for a web application bundler. But you can still use build tools like Babel or TypeScript and get the same speed improvements without the bundler. On every change, your build tool will only need to update a single file, instead of entire bundles.

Below are a collection of guides for using different web frameworks and build tools with Snowpack. If you'd like to add your own, feel free to hit the pencil icon in the top-right to edit our docs.

### Babel

To use Babel with Snowpack:

1. Make sure that your entire application lives inside a source directory (ex: `src/`). 
2. Run Babel to build your `src/` application to an output `lib/` directory (ex: `babel src/ --out-dir lib --watch`)
3. Update your HTML entrypoint to point to your `lib/` directory.
4. Now make changes to your `src/` directory, and see them build instantly.
5. Optional: Check out our Babel plugin for importing packages by name in the guide above.


### TypeScript

TypeScript expects imports to be by package name, and won't be able to understand your "web_modules/" imports by default. You'll need to follow one of the following guides based on your setup:

#### With Babel:

While it may sound like overkill, Babel & TypeScript work well together. This article does a good job of explaining how each tackles their own problem better than either could on their own: [TypeScript With Babel: A Beautiful Marriage](https://iamturns.com/typescript-babel/) 

To use TypeScript with Babel, just use our "Import by Package Name" Babel plugin to rewrite you package name imports at build time. This way, TypeScript will only ever see the package name imports, as expected. See our guide above for more info on connecting this plugin.

#### Without Babel:

To use TypeScript with Snowpack, you'll need to set up your tsconfig.json to understand "web_module" import paths. See our annotated tsconfig.json example below:

```js
"compilerOptions": {
  // Choose your target based on which browsers you'd like to support. 
  "target": "es2017",
  // Required: Use module="esnext" so that TS won't compile/disallow any ESM syntax.
  "module": "esnext",
  // Optional, but recommended
  "moduleResolution": "node",
  // Optional, but recommended
  "baseUrl": ".",
  // Required: Map "/web_modules/*" imports back to their node_modules/ TS definition files.
  "paths": {
      "/web_modules/*.js": [
          "node_modules/@types/*",
          "node_modules/*",
          "web_modules/*.js"
      ]
  },
  // ...
}
```

### Vue

```js
/*
 * https://vuejs.org/v2/guide/installation.html#Explanation-of-Different-Builds
 * NOTE: The Vue package points to the runtime-only distribution by default.
 * You can also point to any other build in the package dist/ folder directly.
 * 
 * Example: import Vue from "/web_modules/vue/dist/vue.esm.browser.js";
 */
import Vue from "/web_modules/vue.js";

// $ snowpack --include "src/index.js"
// ✔ snowpack installed: vue. [1.07s]
```

#### Relevant guides:
- [Importing Packages by Name](#importing-packages-by-name) (Optional)


### Preact

```js
// File: src/index.js
import { h, Component, render } from '/web_modules/preact.js';
// Optional, if using HTM instead of JSX:
import htm from '/web_modules/htm.js';
const html = htm.bind(h);

// $ snowpack --include "src/index.js"
// ✔ snowpack installed: preact, htm. [1.06s]
```

#### Relevant guides:
- [Hello, World! Tutorial](#hello%2C-world!) (Written for Preact!)
- [Snowpack + Babel](#Babel) (Required for JSX)
- [Importing Packages by Name](#importing-packages-by-name) (Optional)


### React

React is [not yet published with ES Module support](https://github.com/facebook/react/issues/11503), and the way it's build makes it impossible to bundle as an entrypoint (*"Error: '__moduleExports' is not exported by node_modules/react/index.js"*). **However**, it is still possible to use React with Snowpack thanks to [@sdegutis](https://github.com/sdegutis)'s [@reactesm](https://www.npmjs.com/org/reactesm) project & npm/yarn's alias feature:

```
npm install react@npm:@reactesm/react react-dom@npm:@reactesm/react-dom
   yarn add react@npm:@reactesm/react react-dom@npm:@reactesm/react-dom
```

@reactesm publishes an ESM build of the latest react & react-dom libraries. When installed under the usual react/react-dom alias, tools like Snowpack will use the easier-to-optimize ESM builds inside your `web_modules/` directory. 

```js
import React, { useState } from '/web_modules/react.js';
```

### JSX

It's important to keep in mind that JSX isn't really JavaScript. JSX is a build-time syntax that only your build tooling understands, and that doesn't run directly in any browser. In any app you work on (bundled or unbundled) you'll need to use a build tool like Babel or TypeScript to transpile JSX into regular old JavaScript before shipping it to the browser.

To use JSX with Snowpack, you can either:

1. Use TypeScript with ["--jsx" mode](https://www.typescriptlang.org/docs/handbook/jsx.html) enabled. See our "TypeScript" guide for more.
1. Use Babel with a plugin like [@babel/plugin-transform-react-jsx](https://babeljs.io/docs/en/babel-plugin-transform-react-jsx) or a framework-specific preset like [@babel/preset-react](https://babeljs.io/docs/en/babel-preset-react). See our "Babel" guide for more.
1. Use a JSX-like alternative that can run in the browser. Jason Miller's [htm](https://github.com/developit/htm) is a great option. 

### Tailwind CSS

```toml
# 1. Build your CSS
npx tailwind build styles.css -o css/tailwind.css
# 2. Load the output file somewhere in your application
<link rel="stylesheet" type="text/css" href="/css/tailwind.css">
```

Tailwind works as-expected with Snowpack. Just follow [the official Tailwind Install Guide](https://tailwindcss.com/docs/installation/). When you get to step #4 ("Process your CSS with Tailwind") choose the official Tailwind CLI option to generate your CSS. Import that generated CSS file in your HTML application.


### Styled Components

```js
// File: src/index.js
import React from "/web_modules/react.js";
import {render} from "/web_modules/react-dom.js";
import styled from "/web_modules/styled-components.js";

// $ snowpack --include "src/index.js"
// ✔ snowpack installed: react, react-dom, styled-components. [1.06s]
```

#### Relevant guides:
- [Snowpack + React](#React) (Required)
- [Snowpack + Babel](#Babel) (Required for JSX)
- [Importing Packages by Name](#importing-packages-by-name) (Optional)


### Material UI

```js
// File: src/index.js
import React from "/web_modules/react.js";
import {render} from "/web_modules/react-dom.js";
import Button from "/web_modules/@material-ui/core/Button/index.js";

// $ snowpack --include "src/index.js"
// ✔ snowpack installed: @material-ui/core/Button/index.js, react, react-dom. [1.64s]
```

#### Relevant guides:
- [Snowpack + React](#React) (Required)
- [Snowpack + Babel](#Babel) (Required for JSX)
- [Importing Packages by Name](#importing-packages-by-name) (Optional)

### Workbox

The [Workbox CLI](https://developers.google.com/web/tools/workbox/modules/workbox-cli) integrates well with Snowpack. Run the wizard to bootstrap your first configuration file, and then run `workbox generateSW` to generate your service worker.

Remember that Workbox expects to be run every time you deploy, as a part of your production "build" process (similar to how Snowpack's [`--optimize`](#production-optimization) flag works).

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

