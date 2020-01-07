## Framework & Library Guides


### Importing CSS

```js
// ✘ NOT SUPPORTED OUTSIDE OF BUNDLERS
import './style.css';
```

No browser today supports importing a CSS file directly from JS. Instead, you'll want to use one of the following libraries/solutions:

1. **Recommended!** If you're building a simple app, consider defining your CSS inside your HTML using a `<style>` block.
2. **Recommended!** `csz`: Adds support for importing CSS from JS
3. `@emotion/core` (React): Adds support for a `css` property on React components. Requires Babel to work.
4. Most CSS-in-JS libraries will work without a bundler, although some require a library-specific Babel plugin to work.

### Importing Images 

```js
// ✘ NOT SUPPORTED OUTSIDE OF BUNDLERS
import './photo.png';
```

No browser today supports importing an image directly from JS. Instead, you'll want to use one of the following libraries/solutions:

1. **Recommended!** You can reference any image file by path. This works for both CSS rules and for `<img>` elements.


### Importing Packages by Name

```js
// ✘ NOT SUPPORTED IN THE BROWSER
// ✔ BUT... CAN BE TRANSFORMED BY BABEL
import 'package-name';
```

Browsers only support importing by URL, so importing a package by name (ex: `import React from 'react'`) isn't supported without additional tooling/configuration. Unless you're using a traditional app bundler or a build tool like Babel, you'll need to import all dependencies in your application by URL (ex: `import React from '/web_modules/react.js'`).

**If you use Babel with Snowpack, you can use our Babel plugin to support package name imports.** The plugin reads any packages name imports in your source code and rewrites them to full `"/web_modules/${PACKAGE_NAME}.js"` URLs that run in the browser. This way, you can keep using the package name imports that you're used to without needing a full web app bundler.

``` js
/* .babelrc */
  "plugins": [
    ["snowpack/assets/babel-plugin.js", {}],
  ]
```

### Babel

Snowpack dramatically speeds up your development time by removing the need for a web application bundler. But you can still use build tools like Babel or TypeScript and get the same speed improvements without the bundler. On every change, your build tool will only need to update a single file, instead of entire bundles.

To use Babel with Snowpack:

1. Make sure that your entire application lives instead a source directory (ex: `src/`). 
2. Run Babel to build your `src/` application to an output `lib/` directory (ex: `babel src/ --out-dir lib --watch`)
3. Update your HTML entrypoint to point to your `lib/` directory.
4. Now make changes to your `src/` directory, and see them build instantly.
5. Optional: Check out our Babel plugin for importing packages by name in the guide below.


### TypeScript

Snowpack dramatically speeds up your development time by removing the need for a web application bundler. But you can still use build tools like Babel or TypeScript and get the same speed improvements without the bundler. On every change, your build tool will only need to update a single file, instead of entire bundles.

By default, TypeScript expects to import packages by name. There are two solutions to get TypeScript and Snowpack working well together.

1. If you are using Babel to build your app, you can leverage our Babel plugin to continue to write imports by package name in a way that TypeScript will also understand (see instructions above). Using Babel & TypeScript together can feel like overkill, but it works decently well.
2. If you can't use Babel, then you'll need to add the following to your `tsconfig.json` configuration to support typed `"/web_modules/*.js"` imports:

```js
"compilerOptions": {
 "moduleResolution": "node",
  "baseUrl": ".",
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


### React

React is [not yet published with ES Module support](https://github.com/facebook/react/issues/11503), and the way it's build makes it impossible to bundle as an entrypoint (`Error: '__moduleExports' is not exported by node_modules/react/index.js`). **However**, it is still possible to use React with Snowpack thanks to [@sdegutis](https://github.com/sdegutis)'s [@reactesm](https://www.npmjs.com/org/reactesm) project & npm/yarn's alias feature:

```
npm install react@npm:@reactesm/react react-dom@npm:@reactesm/react-dom
   yarn add react@npm:@reactesm/react react-dom@npm:@reactesm/react-dom
```

This command installs ESM versions of the latest react & react-dom, which Snowpack will then use when it installs your `web_modules/` directory. This works with [any ESM-compatible React libraries](https://www.pika.dev/search?q=react-) as well!

```js
import React, { useState } from './web_modules/react.js';
```

### JSX

When writing JSX, it's important to remember that JSX is a built-time syntax that won't run directly in any browser. You'll need to use a build tool like Babel to transpile your JSX into regular old JavaScript before shipping it to the browser.

To use JSX with Snowpack, you can either:

1. Add Babel to build your `src/` application to an output `lib/` directory, and load that in the browser.
1. Use a JSX-like library like Jason Miller's [htm](https://github.com/developit/htm) that can run in the browser.

### Tailwind CSS

TODO

### Styled Components

TODO.
