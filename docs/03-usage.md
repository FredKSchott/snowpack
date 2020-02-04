## Basic Usage

Snowpack has a single goal: to install web-ready npm packages to `web_modules/` directory. It doesn't touch your source code. What you build with it, which frameworks you use, and how you serve your project locally is entirely up to you. You can use as many or as few tools on top of Snowpack as you'd like.

Still stuck? See our [Quick Start](#quick-start) guide above for help to get started.

### Zero-Config Installs (Default)

```
$ npx snowpack
```

By default, Snowpack will attempt to install all "dependencies" listed in your package.json manifest. If the package defines an ESM "module" entrypoint, then that package is installed into your new `web_modules/` directory.

As long as all of your web dependencies are listed as package.json "dependencies" (with all other dependencies listed under "devDependencies") this zero-config behavior should work well for your project.

### Automatic Installs (Recommended)

```
$ npx snowpack --include "src/**/*.js"
```

With some additional config, Snowpack is also able to automatically detect dependencies by scanning your application for import statements. This is the recommended way to use Snowpack, since it is both faster and more accurate than trying to install every dependency.

To enable automatic import scanning, use the `--include` CLI flag to tell Snowpack which files to scan for. Snowpack will automatically scan every file for imports with `web_modules` in the import path. It will then parse those to find every dependency required by your project.

Remember to re-run Snowpack every time you import an new dependency.

### Whitelisting Dependencies

```js
/* package.json */
"snowpack": {
  "webDependencies": [
    "htm",
    "preact",
    "preact/hooks", // A package within a package
    "unistore/full/preact.es.js", // An ESM file within a package (supports globs)
    "bulma/css/bulma.css" // A non-JS static asset (supports globs)
  ],
}
```

Optionally, you can also whitelist any dependencies by defining them in your "webDependencies" config (see below). You can use this to control exactly what is installed, including non-JS assets or deeper package resources.

Note that this config will disable the zero-config mode that attempts to install every package found in your package.json "dependencies". Either use this together with the `--include` flag, or just make sure that you whitelist everything that you want installed.


### Skipping NPM Install

```
$ snowpack --source pika
```

```js
/* package.json */
"snowpack": {
  "source": "pika"
}
```

Snowpack defaults to reading packages from your local `node_modules/` directory, but you can control this behavior with the `--source` flag to simplify your Snowpack install step even further.

Use `--source pika` to have Snowpack fetch packages directly from the [Pika CDN](https://cdn.pika.dev/) instead of your local `node_modules/` directory. Your app will still get the same npm package code, but now Snowpack is fully installing and managing your npm dependencies for you. You no longer have to run `npm install` before running Snowpack.

After a successful run with `--source pika`, Snowpack will create a `snowpack.lock.json` [import map](https://github.com/WICG/import-maps) in your project which locks each dependency to a specific version for future installations. Each CDN response is cached locally, so repeat runs of Snowpack happen at local speeds. `npm` & `yarn` should still be used to manage your server-side dependencies. 
