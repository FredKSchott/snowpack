test CI

<p align="center">
  <img alt="Logo" src="https://i.imgur.com/q6JcN0B.png" width="720">
</p>

<p align="center">
   <strong>@pika/web</strong> • Install npm dependencies to run directly in the browser. No Browserify, Webpack or import maps required.
</p>

- **Simple** 💪 No app bundlers required. Just run once at install time.
- **Flexible** 🧘‍♂️ Handles dependency trees of any size, even ones that includes legacy Common.js packages.
- **HTTP/2 Optimized** ⚡️ No more huge JS bundles. Browsers only download dependencies when they change.


## Install

```bash
npx @pika/web                            # Run once.
npm install -g @pika/cli && pika install # Run multiple.
npm install --dev @pika/web              # Optional: Install locally to use "pika install" in any package.json scripts
```

## Quickstart

```diff
# 1. Run @pika/web in your project:
    $ npx @pika/web
    
# 2. Replace all NPM package imports in your web app with web-native URLs:
-   import { createElement, Component } from "preact";
+   import { createElement, Component } from "/web_modules/preact.js";
-   import htm from "htm";
+   import htm from "/web_modules/htm.js";

# 3. Run your code directly in the browser and see the magic!
    ✨ ~(‾▿‾~)(~‾▿‾)~ ✨
    
# Optional: Using Babel? Skip "Step 2" and let our plugin rewrite your imports automatically:
    echo '{"plugins": [["@pika/web/assets/babel-plugin.js"]]}' > .babelrc
# Optional: Install @pika/web locally so that it runs faster next time...
    npm install --save-dev @pika/web
# Optional: ...and then add a "prepare" script to your package.json to have it run after every install:
    {"scripts": {"prepare": "pika install"}}
```


@pika/web installs npm packages as single `.js` files to a new `web_modules/` directory. If your dependency exports an [ES "module" entrypoint](https://github.com/rollup/rollup/wiki/pkg.module) in its `package.json` manifest, it is supported. Even if it internally depends on other npm packages (even legacy Common.js packages) @pika/web should be able to handle it.

Bundling packages on a per-module basis like this makes it easy to build a web application that runs fast and caches well. Updating a single dependency won't force a complete re-download of your web application. [More on performance below.](#performance)

> ┳┻| _  
> ┻┳| •.•) 💬 *"Tip: Use [pika.dev](https://www.pika.dev) to search 70,000+ modern, web-ready packages on npm"*  
> ┳┻|⊂ﾉ


## Examples

- "Hello, World": [[Source]](https://glitch.com/edit/#!/pika-web-example-simple) [[Live Demo]](https://pika-web-example-simple.glitch.me/)
- Preact + HTM: [[Source]](https://glitch.com/edit/#!/pika-web-example-preact-htm) [[Live Demo]](https://pika-web-example-preact-htm.glitch.me)
- Vue: [[Source]](https://glitch.com/edit/#!/pika-web-vue-httpvueloader) [[Live Demo]](https://pika-web-vue-httpvueloader.glitch.me/) [By: [@thiagoabreu](https://github.com/thiagoabreu)]
- Preact, HTM, Electron, Three.js... [See our full list of examples →](/EXAMPLES.md)

## Performance

When @pika/web installs your dependencies, it bundles each package into a single ESM JavaScript file. Example: If @pika/web installs 10 npm packages into `web_modules/`, you can expect 10 JavaScript files and maybe 1-2 additional files of code shared between them.

Max Jung's post on ["The Right Way to Bundle Your Assets for Faster Sites over HTTP/2"](https://medium.com/@asyncmax/the-right-way-to-bundle-your-assets-for-faster-sites-over-http-2-437c37efe3ff) is the best study on HTTP/2 performance & bundling we could find online. @pika/web's installation most closely matches the study's moderate, "50 file" bundling strategy. Jung's post found that for HTTP/2, "differences among concatenation levels below 1000 [small files] (50, 6 or 1) were negligible."

## Browser Support

@pika/web installs ES Module (ESM) dependencies from npm, which run [wherever ESM syntax is supported](https://caniuse.com/#feat=es6-module). This includes 86%+ of all browsers in use today: All modern browsers (Firefox, Chrome, Edge, Safari) going back at least a year, but notably not IE11 or UC Browser for Android.

Additionally, @pika/web runs all dependencies through Babel via `@preset/env` to transpile any language features not yet supported in most modern browsers. You can customize how dependencies are transpiled by setting your own "browserslist" key in your `package.json` manifest:

```js
  /* package.json - Recommended target for ESM-supporting browsers (default) */
  "browserslist": ">0.75%, not ie 11, not op_mini all"
```

## Options

### `package.json` config

> *Note: All package.json options are scoped under the `"@pika/web"` property.*

* `"webDependencies"`: (Recommended) Configure which packages to install with @pika/web. Without this, @pika/web will just try to install every package in your "dependencies" config. That behavior is great for getting started but it won't warn you if an expected package fails to install. 
* `"namedExports"`: (Optional) If needed, you can explicitly define named exports for any dependency. You should only use this if you're getting `"'X' is not exported by Y"` errors without it. See [rollup-plugin-commonjs](https://github.com/rollup/rollup-plugin-commonjs#usage) for more info.
* `"dedupe"`: (Optional) If needed, force resolving for these modules to root's node_modules. This helps prevend bundling package multiple time if package is imported from dependencies. See [rollup-plugin-node-resolve](https://github.com/rollup/rollup-plugin-node-resolve#usage). This is usefull when developing a dependency locally, and prevent rollup to duplicate dependencies included both in local and remote packages. 

```js
  "dependencies": { "htm": "^1.0.0", "preact": "^8.0.0", /* ... */ },
  "@pika/web": {
    "webDependencies": [
      "htm",
      "preact",
      "preact/hooks", // A package within a package
      "unistore/full/preact.es.js", // An ESM file within a package (supports globs)
      "bulma/css/bulma.css" // A non-JS static asset (supports globs)
    ],
    "dedupe": [
        "lit-element",
        "lit-html" 
    ]
  },
```

### CLI

| Option    | Description                                                                                    | Example                          |
|-----------|------------------------------------------------------------------------------------------------|----------------------------------|
| `--entry` | Auto-detect `import`s from your codebase. Supports [glob](https://www.npmjs.com/package/glob). | `npx @pika/web --entry 'src/**/*.js'` |

## A Note on React

React is [not yet published with ES Module support](https://github.com/facebook/react/issues/11503), and the way it's build makes it impossible to bundle as an entrypoint (`Error: '__moduleExports' is not exported by node_modules/react/index.js`). **However**, it is still possible to use React with @pika/web thanks to [@sdegutis](https://github.com/sdegutis)'s [@reactesm](https://www.npmjs.com/org/reactesm) project & npm/yarn's alias feature:

```
npm install react@npm:@reactesm/react react-dom@npm:@reactesm/react-dom
   yarn add react@npm:@reactesm/react react-dom@npm:@reactesm/react-dom
```

This command installs ESM versions of the latest react & react-dom, which @pika/web will then use when it installs your `web_modules/` directory. This works with [any ESM-compatible React libraries](https://www.pika.dev/search?q=react-) as well!

```js
import React, { useState } from './web_modules/react.js';
```


## A Note on JSX

Remember that JSX won't run in any browser. To use JSX with @pika/web:

1. Use Babel to build your `src/` directory to an output `lib/` directory, and load that in the browser.
1. Use a JSX-like library like Jason Miller's [htm](https://github.com/developit/htm) that can run in the browser.


## A Note on TypeScript

@pika/web is meant to play well with TypeScript. https://www.pika.dev itself is built using both tools. But by default, TypeScript expects to import packages by name. There are two solutions to get TypeScript and @pika/web working well together.

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
      
## Special Thanks: Rollup

@pika/web is powered internally by [Rollup](https://rollupjs.org/). We believe that bundlers shouldn't be a *requirement* for modern web app development, but none of this would be possible without the awesome work done by Rollup contributors. If you use and enjoy our software, consider contributing back to [Rollup on Open Collective](https://opencollective.com/rollup).
