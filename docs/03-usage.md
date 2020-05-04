## Basic Usage

### snowpack install

Unbundled development wouldn't be possible without Snowpack's npm package installer. When you run `snowpack install`, Snowpack scans your `src/` directory to find and install every referenced npm package to run bundle-free on the web. You can also provide a list of package names manually via the "knownEntrypoints" config that should be installed along with any scanned `src/` dependencies.

``` bash
# Example: Snowpack detects `import 'react'` & `import 'react-dom'` statements in your "src/" code.

$ snowpack install
# snowpack installed: react, react-dom.

$ ls web_modules/
# react.js react-dom.js import.map.js
```

Every installed package can be imported and run directly in the browser, with zero addition bundling or tooling required. This is the foundation that all bundle-free development (and the rest of Snowpack) is built on top of.

By default, Snowpack will install these frontend packages to the `web_modules/` directory using the existing package code already found in your project's `node_modules/` directory. To avoid the extra step of having to install each package twice (once with npm/yarn, and then again with Snowpack) you can have Snowpack fully manage your frontend dependencies via the package.json "webDependencies" config. Learn more about removing the unnecessary `npm install` step in the Fully-Managed Dependencies section below.


### snowpack dev

Snowpack's dev server is an instant dev environment for any web application. `snowpack dev` starts up instantly, regardless of how many files your project has. In bundle-free development each file is only build as requested by the browser, so there's almost no setup work to do at startup and no rebundling to wait for every time you change a single file. 

By default, three specific project directories make up your hosted application:

- `web_modules/` - Your Snowpack-installed web dependencies.
- `public/` (Mounted to the root URL) - Any static web assets.
- `src/` (Mounted to `/_dist_/*` URL)  - Any application source code.

**By default, Snowpack will build all `src/` files before sending them to the browser.** This lets you author your application code using whatever language you'd like (JSX, TypeScript, Vue, Svelte, etc.) as long as Snowpack knows how transform it into the browser-native JavaScript that it serves at the `/_dist_/*` URL path.  Check out the "Build Scripts" section below for more information about which source transformations are supported by default and how to create your own.

### snowpack build

When you're ready to deploy your application, run `snowpack build` to generate a static copy of your site for production. The build command is tightly integrated with your dev configuration, so you are guarenteed to get a working copy of the same code you saw during development.

### snowpack build --bundle

The default output of the `snowpack build` command is an exact copy of your unbundled dev site. Deploying unbundled code is fine for simple sites, but you may want to optimize your site by bundling your final deployment for production. 

**Snowpack supports production bundling via a simple, zero-config `--bundle` flag.** `snowpack build --bundle` runs your final build through [Parcel](https://parceljs.org/), a popular web application bundler. By bundling together your JavaScript and CSS files into larger shared chunks, you may see a production speed up as your users have fewer files to download. 
