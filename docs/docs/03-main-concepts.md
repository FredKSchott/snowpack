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

``` html
<!-- This runs directly in the browser with `snowpack dev` -->
<body>
  <script type='module'>
    import * as React from 'react';
    console.log(React);
  </script>
</body>
```

### Snowpack's Dev Server

![dev command output example](/img/snowpack-dev-startup-2.png)

`snowpack dev` - Snowpack's dev server is an instant dev environment for [unbundled development.](#unbundled-development) The dev server will only build a file when it's requested by the browser. That means that Snowpack can start up instantly (usually in **<50ms**) and scale to infinitely large projects without slowing down. In contrast, it's common to see 30+ second dev startup times when building large apps with a traditional bundler.

Snowpack supports JSX & TypeScript source code by default, compiling your files to JavaScript before sending them to the browser. You can extend this even further with custom [Build Scripts](#build-scripts) & [Plugins](#build-plugins) to connect your favorite build tools to Snowpack: TypeScript, Babel, Vue, Svelte, PostCSS, Sass... go wild!


### Snowpack's Build Pipeline

![build output example](/img/snowpack-build-example.png)

`snowpack build` - When you're ready to deploy your application, run the build command to generate a static production build of your site. Building is tightly integrated with your dev setup so that you are guaranteed to get a near-exact copy of the same code that you saw during development.

Deploying this basic build is fine for simple sites, but you may want to optimize your site even further by bundling your site for production. Minification, code-splitting, tree-shaking, dead code elimination, and more optimizations can all happen at this stage by adding back a traditional bundler to your build process.

Snowpack recommends using the official [Webpack plugin](https://www.npmjs.com/package/@snowpack/plugin-webpack). [Parcel](https://www.npmjs.com/package/@snowpack/plugin-parcel) is also supported. Connect your favorite, and then run `snowpack build` to get a bundled build of your site for production. 

```js
// snowpack.config.json
{
  // Optimize your production builds with Webpack
  "plugins": [["@snowpack/plugin-webpack", {/* ... */}]]
}
```

If you don't want to use a bundler, that's okay too. By default, Snowpack generates a build for you that runs just fine without a bundler. This is what the Snowpack project has been all about from the start: **Use a bundler because you want to, and not because you need to.**

