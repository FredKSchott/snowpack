## Commands

### snowpack dev

Snowpack's dev server is an instant dev environment for any web application. `snowpack dev` stays fast by skipping all unecceary bundling during development and serving individual files directly to the browser. That means **zero** upfront startup cost: Snowpack only starts building your app when you make your first request. This scales especially well to large projects, where you'd otherwise commonly see 30+ second dev startup times with a traditional bundler.

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

When you're ready to deploy your application, run `snowpack build` to generate a static production build of your site. Building is tightly integrated with your dev setup so that you are guaranteed to get a working copy of the same code you saw during development.

The default output of the `snowpack build` command is an exact copy of your unbundled dev site. Deploying unbundled code is fine for simple sites, but you may want to optimize your site even further by bundling your final deployment for production. 

**Snowpack supports production bundling via a simple, zero-config `--bundle` flag.** `snowpack build --bundle` runs your final build through [Parcel](https://parceljs.org/), a popular web application bundler. By bundling together your JavaScript and CSS files into larger shared chunks, you may see a production speed up as your users have fewer files to download.


### snowpack install

Snowpack originally became famous for it's npm package install. Since then, the installer has been integrated directly into the `dev` & `build` workflows so that you no longer need to run the Snowpack installer yourself. Feel free to skip this section and come back later: you probably won't ever need to run this command.

But, if you want to run the installer yourself, `snowpack install` will install your dependencies into a new `web_modules/` directory. Snowpack will scan your project for ESM `import` statements to find every npm package used by your application. You can also provide a list of package names manually via the ["install"](#all-config-options) config.

``` bash
# Example: Snowpack detects `import 'react'` & `import 'react-dom'` statements in your "src/" code.
✔ snowpack install complete. [0.88s]

  ⦿ web_modules/                 size       gzip       brotli   
    ├─ react-dom.js              128.93 KB  39.89 KB   34.93 KB   
    └─ react.js                  0.54 KB    0.32 KB    0.28 KB    
  ⦿ web_modules/common/ (Shared)
    └─ index-8961bd84.js         10.83 KB   3.96 KB    3.51 KB    
```

From here, any `web_modules/` package can be imported and run directly in the browser with zero additional bundling or tooling required. This ability to import npm packages natively in the browser (without a bundler) is the foundation that all no-bundle development (and the rest of Snowpack) is built on top of.

``` html
<!-- This runs directly in the browser! -->
<script type='module'>
  import * as React from '/web_modules/react.js';
  console.log(React);
</script>
```

Again, all of this is built into Snowpack `dev` & `build` commands by default. But, you can use the `install` command to install & manage web-ready npm packages for your own dev server or build pipeline.
