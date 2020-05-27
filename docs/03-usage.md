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
