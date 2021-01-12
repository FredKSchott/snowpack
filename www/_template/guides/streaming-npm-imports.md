---
layout: layouts/content.njk
title: Streaming NPM Imports
published: true
stream: Load dependencies from remote sources instead of node_modules.
---

<div class="notification">
Status: Experimental
</div>

By default, Snowpack will load npm dependencies out of your `node_modules/` directory and then build/bundle them to run in the browser. While we are able to cache this work for reuse as much as possible, it can still take time to build all dependencies. This is a problem that affects all build tools (not just Snowpack) and it becomes especially noticeable in large projects.

To solve this problem, Snowpack supports loading your dependencies from remote sources. Today, we support two options:

- `"local"` - The default, existing behavior that reads dependencies from `node_modules/`
- `"skypack"` - Load dependencies on-demand from the [Skypack CDN](https://skypack.dev/).
- _in a future release, custom sources will be supported via plugin._

```js
// snowpack.config.js
"experiments": {
  "source": "skypack"
}
```

Loading your dependencies from Skypack has several benefits over the traditional "npm install" approach:

- **Speed:** Skip the install + build steps for dependencies, and load your dependencies as pre-build ESM code directly from a CDN like Skypack.
- **Safety:** ESM packages are pre-built and never given access to [run code on your machine](https://www.usenix.org/system/files/sec19-zimmermann.pdf). Packages only run in the browser sandbox.
- **Simplicity:** ESM packages are managed by Snowpack, so frontend projects that don't need Node.js (Rails, PHP, etc.) can drop the npm CLI entirely if they choose.
- **Identical Builds:** When you build your site for production, package code is transpiled with the rest of your site and tree-shaken to your exact imports, resulting in a final build that's nearly identical.
