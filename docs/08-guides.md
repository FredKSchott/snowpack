## Guides

### Optimizing for Production

```
$ npx snowpack --optimize
```

By default, Snowpack installs dependencies optimized for development. When you're ready for production, you can run Snowpack with the `--optimize` flag to enable certain production-only optimizations:

- **Minification:** Dependencies will be minified (with source maps).
- **Transpilation:** Dependencies will be transpiled to match your application's [browser support target](#customize-browser-support) (in case any dependencies use too-modern language features).
- **Tree-Shaking:** Dependencies will have unused code removed based on your imports (when "Automatic Mode" is enabled via the `--include` flag).



### TypeScript

Snowpack is expected to play well with TypeScript. https://www.pika.dev itself is built using both tools. But by default, TypeScript expects to import packages by name. There are two solutions to get TypeScript and Snowpack working well together.

If you are using Babel to build your app, you can leverage our Babel plugin to continue to write imports by package name in a way that TypeScript will also understand (see instructions above).

Otherwise, add the following to your `tsconfig.json` configuration to support typed `"/web_modules/*.js"` imports:

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

Remember that JSX won't run directly in any browser. To use JSX with Snowpack you will need to do one of the following:

1. Use Babel to build your `src/` application to an output `lib/` directory, and load that in the browser.
1. Use a JSX-like library like Jason Miller's [htm](https://github.com/developit/htm) that can run in the browser.


### Saying Goodbye (Migrating)

Snowpack is designed for zero lock-in. If you ever feel the need to add a traditional application bundler to your stack (for whatever reason!) you can do so in seconds. 

Any application built with Snowpack should Just Work™️ when passed through Webpack/Rollup/Parcel. If you are importing packages by full URL (ex: `import React from '/web_modules/react.js'`), then a simple Find & Replace should help you re-write them to plain package names.
