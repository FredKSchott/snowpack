---
layout: layouts/content.njk
title: Streaming Package Imports
published: true
stream: Fetch dependencies on-demand from a remote ESM CDN,
---

By default, Snowpack loads npm-installed dependencies out of your local `node_modules/` directory. While we can cache this work for reuse as much as possible, it can still take time to build up your dependencies for use in the browser. This is a problem that affects all frontend build tools (not just Snowpack) and it becomes especially noticeable in large projects.

Snowpack v3.0 introduces a new feature called **Streaming Package Imports** that fetches your imported npm packages on-demand as pre-build ESM, circumventing the need for `npm install` entirely. By managing your frontend dependencies with Snowpack, you can leave `npm` for tooling-only packages or drop your dependency on `npm`/`yarn`/`pnpm` all togther.

## To Enable Streaming Imports

```js
// snowpack.config.js
"packageOptions": {
  "source": "remote"
}
```

## How Streaming Imports Work

When you enable streaming imports, `snowpack` will start fetching all imports from `https://pkg.snowpack.dev`. For example, `import "preact"` in your project will become something like `import "https://pkg.snowpack.dev/preact"` in the browser. Importing from a remote URL like this tells the browser to fetch preact from that URL on-demand.

`pkg.snowpack.dev` is an ESM Package CDN, powered by [Skypack](https://www.skypack.dev/). Every npm package is hosted there as ESM, and any legacy non-ESM packages are upconverted to ESM. Snowpack will fetch your package from `pkg.snowpack.dev` and then cache it locally for future use.

## Benefits of Streaming Imports

Streaming dependencies have several benefits over the traditional "npm install + local bundling" approach:

- **Speed:** Skip the install + build steps for dependencies, and load your dependencies as pre-build ESM code directly from an ESM CDN like [Skypack](https://www.skypack.dev/). Dependencies are cached locally for offline reuse.
- **Safety:** ESM packages are pre-built and never given access to [run code on your machine](https://www.usenix.org/system/files/sec19-zimmermann.pdf). Packages only run in the browser sandbox.
- **Simplicity:** ESM packages are managed by Snowpack, so frontend projects that don't need Node.js (Rails, PHP, etc.) can drop the `npm` CLI entirely if they choose.
- **No Impact on Final Build:** Streaming imports are still transpiled and bundled with the rest of your final build, and tree-shaken to your exact imports. The end result is a final build that's nearly identical to what it would have been otherwise.

## Snowpack-Managed Dependencies

You can use `snowpack add` and `snowpack rm` to manage your dependencies with Snowpack. Running `snowpack add [package-name]` will create a new `snowpack.deps.json` file to store information about your dependencies, like desired version ranges and lockfile information. If you're familiar with `npm install`, your `snowpack.deps.json` file is like a combined `package.json` and `package-lock.json`.

When

## Using Streaming Imports with TypeScript

```js
// snowpack.config.js /w TypeScript Support
"packageOptions": {
  "source": "remote",
  "types": true,
}
```

Setting `types=true` tells Snowpack to install TypeScript types in your project. Run `snowpack prepare` to prepare your project for development, which will install TypeScript type declarations for every package in your `snowpack.deps.json` file. Snowpack will install those types into a local `.snowpack/types` directory in your project, which you can then point to in your `tsconfig.json`:

```js
// tsconfig.json /w Snowpack types support
"baseUrl": "./",
"paths": {"*": [".snowpack/.types/*"]},
```

## Using Streaming Imports with Non-JS Packages (Svelte, Vue, etc.)

Skypack (which powers `pkg.snowpack.dev`) builds any non-JS package syntax like `.svelte` and `.vue` files to ESM. This works for most packages (including most Svelte & Vue packages) but may cause trouble in some projects. In a future release, we'll add better support to build these kinds of packages locally.
