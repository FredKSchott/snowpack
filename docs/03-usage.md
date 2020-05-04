## Basic Usage

### snowpack install

Unbundled development wouldn't be possible without Snowpack's npm package installer. When you run `snowpack install`, Snowpack scans your source code for all package imports and then installs these npm packages to a new `"web_modules/"` directory in your current project. It does all the work upfront to convert every raw npm package into a web-ready, single JS file that runs natively in your browser.

``` bash
# Example: Snowpack detects `import 'react'` & `import 'react-dom'` statements in your "src/" code.

$ snowpack install
# snowpack installed: react, react-dom.

$ ls web_modules/
# react.js react-dom.js import.map.js
```

If it helps, you can think of your `web_modules/` directory like you do your `node_modules/` directory. But, instead of containing raw package folders, each package is installed as a single, web-ready JS file. Every other Snowpack workflow (`dev`, `build`, etc) is built on top of this directory.

### snowpack dev

Snowpack's dev server is your instant dev environment for any web application. `snowpack dev` starts up instantly, in less than <20ms on most machines. This speed isn't affected by the size of your project, since files are only built as they are requested by the browser. By skipping bundling during development, you no longer have to wait for your application to rebundle entire chunks of your application every time you change a single file. 

By default, Snowpack makes three directories in your project available to the browser as a part of your hosted application (known as "mounting"):

- `web_modules/` - Your Snowpack-installed web dependencies.
- `public/` (Mounted to the root URL) - Any static web assets.
- `src/` (Mounted to `/_dist_/*` URL)  - Any application source code.

**By default, Snowpack will build files inside the `src/` directory before sending them to the browser.** This lets you author your application code using whatever language you'd like (JSX, TypeScript, Vue, Svelte, etc.) as long as Snowpack knows how transform it into browser-native JavaScript.  Check out the "Build Scripts" section below for more information about which source transformations are supported by default and how to create your own.

### snowpack build

When you're ready to deploy your application, run `snowpack build` to generate a static copy of your site for production. The build command is tightly integrated with your dev configuration, so you are guarenteed to get a working copy of the same code you saw during development.

### snowpack build --bundle

The default output of the `snowpack build` command is an exact copy of your unbundled dev site. Deploying unbundled code is fine for simple sites, but you may want to optimize your site by bundling your final deployment for production. 

**Snowpack supports production bundling via a simple, zero-config `--bundle` flag.** `snowpack build --bundle` runs your final build through [Parcel](https://parceljs.org/), a popular web application bundler. By bundling together your JavaScript and CSS files into larger shared chunks, you may see a production speed up as your users have fewer files to download. 
