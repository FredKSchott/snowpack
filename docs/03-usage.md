## Basic Usage

### snowpack install

Unbundled development wouldn't be possible without Snowpack's install command. Snowpack will scan your project for ESM `import` statements to find every npm package used by your application. It then installs them to a new `web_modules/` directory. 

You can also provide a list of package names manually via the ["knownEntrypoints"](#all-config-options) config.

``` bash
# Example: Snowpack detects `import 'react'` & `import 'react-dom'` statements in your "src/" code.

$ snowpack install
# snowpack installed: react, react-dom.

$ ls web_modules/
# react.js react-dom.js import.map.js
```

From here, any package can be imported and run directly in the browser with zero addition bundling or tooling required. This ability to import npm packages natively in the browser (without a bundler) is the foundation that all no-bundle development (and the rest of Snowpack) is built on top of.

``` html
<!-- This runs directly in the browser! -->
<script type='module'>
  import * as React from '/web_modules/react.js';
  console.log(React);
</script>
```

To avoid the extra step of having to install each frontend package twice (once with npm/yarn, and then again with Snowpack) you can have Snowpack fully manage your frontend dependencies via the package.json "webDependencies" config. Learn more about removing the unnecessary `npm install` step in the [Managed Dependencies](#managed-dependencies) section below.


### snowpack dev

Snowpack's dev server is an instant dev environment for any web application. `snowpack dev` starts up instantly, regardless of how many files your project has. In no-bundle development each file is only build as requested by the browser, so there's almost no work done at startup and no rebundling to wait for every time you change a single file. 

To start, `snowpack dev` acts as a static file server for your entire project directory during development. You can import packages by name in any JS file and the dev server will automatically rewrite each import for you:

``` js
// File Input:
import * as React from 'react';

// Dev Server Output:
import * as React from '/web_modules/react.js';
```

Extend your build pipeline to handle more complex transformations via Snowpack [build scripts](#build-scripts). Build scripts tellhow Snowpack how to transform your source files, allowing you to code in whatever language you'd like (JSX, TypeScript, Vue, Svelte, etc.). Check out the [build scripts](#build-scripts) section below to learn more.

### snowpack build

When you're ready to deploy your built application, run `snowpack build` to generate a static copy of your site for production. The build command is tightly integrated with your dev server so that you are guaranteed to get a working copy of the same code you saw during development.

### snowpack build --bundle

The default output of the `snowpack build` command is an exact copy of your unbundled dev site. Deploying unbundled code is fine for simple sites, but you may want to optimize your site by bundling your final deployment for production. 

**Snowpack supports production bundling via a simple, zero-config `--bundle` flag.** `snowpack build --bundle` runs your final build through [Parcel](https://parceljs.org/), a popular web application bundler. By bundling together your JavaScript and CSS files into larger shared chunks, you may see a production speed up as your users have fewer files to download.
