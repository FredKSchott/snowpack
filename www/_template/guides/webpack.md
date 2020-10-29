---
layout: layouts/guide.njk
---

### Webpack

```js
// snowpack.config.json
{
  // Optimize your production builds with Webpack
  "plugins": [["@snowpack/plugin-webpack", {/* ... */}]]
}
```

Snowpack ships an official [webpack plugin](https://www.npmjs.com/package/@snowpack/plugin-webpack) for optimizing your build. Connect the `"@snowpack/plugin-webpack"` plugin into your Snowpack configuration file and then run `snowpack build` to see your optimized, bundled build.

See ["Optimized Builds"](/#optimized-builds) for more information about connecting bundled (or unbundled) optimization plugins for your production builds.
