## Basic Usage

### snowpack install

Unbundled development wouldn't be possible without Snowpack's install command. Snowpack will scan your `src/` directory to find every npm package used in your application and install them to a new `web_modules/` directory. You can also provide a list of package names manually via the "knownEntrypoints" config.

``` bash
# Example: Snowpack detects `import 'react'` & `import 'react-dom'` statements in your "src/" code.

$ snowpack install
# snowpack installed: react, react-dom.

$ ls web_modules/
# react.js react-dom.js import.map.js
```


Snowpack installs each package to a new `web_modules/` directory. From here, each package can be imported and run directly in the browser with zero addition bundling or tooling required. The ability to import npm packages natively in the browser (without a bundler) is at the foundation that all bundle-free development (and the rest of Snowpack) is built on top of.

To avoid the extra step of having to install each frontend package twice (once with npm/yarn, and then again with Snowpack) you can have Snowpack fully manage your frontend dependencies via the package.json "webDependencies" config. Learn more about removing the unnecessary `npm install` step in the [Managed Dependencies](#managed-dependencies) section below.


### snowpack dev

Snowpack's dev server is an instant dev environment for any web application. `snowpack dev` starts up instantly, regardless of how many files your project has. In bundle-free development each file is only build as requested by the browser, so there's almost no setup work to do at startup and no rebundling to wait for every time you change a single file. 

By default, `snowpack dev` creates a static file server to host your project directory in development. However, you can configure and expand this behavior with build scripts. Build scripts define how Snowpack should build your application, allowing you to author code in whatever language you'd like (JSX, TypeScript, Vue, Svelte, etc.). Check out the [Build Scripts](#build-scripts) section below to learn more.

### snowpack build

When you're ready to deploy your application, run `snowpack build` to generate a static copy of your site for production. The build command is tightly integrated with your dev configuration, so you are guarenteed to get a working copy of the same code you saw during development.

### snowpack build --bundle

The default output of the `snowpack build` command is an exact copy of your unbundled dev site. Deploying unbundled code is fine for simple sites, but you may want to optimize your site by bundling your final deployment for production. 

**Snowpack supports production bundling via a simple, zero-config `--bundle` flag.** `snowpack build --bundle` runs your final build through [Parcel](https://parceljs.org/), a popular web application bundler. By bundling together your JavaScript and CSS files into larger shared chunks, you may see a production speed up as your users have fewer files to download.
