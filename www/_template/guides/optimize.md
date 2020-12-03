---
layout: layouts/content.njk
title: Optimize for Production
published: false
---

Snowpack builds your site into web native JS, CSS, and HTML files. This "unbundled" deployment can be enough for small sites, but many developers prefer to optimize and bundle their final site for production performance. 

Snowpack build optimizations come in two flavors: **built-in** (esbuild) & **plugin** (webpack, rollup, or whatever else you might like to run). 

### Option 1: Built-in Optimizations

<div class="notification">
Status: Experimental
</div>

Snowpack recently released a built-in optimization pipeline powered by [esbuild](https://esbuild.github.io/). Using this built-in optimizer, you cn now bundle, transpile, and minify your production builds 10x-100x faster than Webpack or Rollup. However, esbuild is still young and [not yet production-ready](https://esbuild.github.io/faq/#production-readiness). At the moment, we only recommended this for smaller projects.

```js
// snowpack.config.js
// Built-in bundling support
{
  "experiments": {
    "optimize": {
      "bundle": true,
      "minify": true
      "target": 'es2018'
    }
  }
}
```

```ts
export interface OptimizeOptions {
  entrypoints: 'auto' | string[] | (({files: string[]}) => string[]);
  preload: boolean;
  bundle: boolean;
  manifest: boolean;
  minify: boolean;
  target: 'es2020' | 'es2019' | 'es2018' | 'es2017';
}
```


### Option 2: Optimize Plugins

Snowpack supports popular bundlers via plugin: 

- webpack (recommended!): [@snowpack/plugin-webpack](https://www.npmjs.com/package/@snowpack/plugin-webpack)
- Rollup: [snowpack-plugin-rollup-bundle](https://github.com/ParamagicDev/snowpack-plugin-rollup-bundle)

**For now, we recommend using @snowpack/plugin-webpack until our built-in optimize support is more mature.**

Check out our [Plugins Catalog](/plugins) to browse all available Snowpack plugins, and read the [Plugins Guide](/guides/plugins) if you're interested in creating your own.

<!-- 
### Recommended: Optimize your build with Webpack

Connect the `"@snowpack/plugin-webpack"` plugin in your Snowpack configuration file and then run `snowpack build` to see your optimized, _bundled_ build.

```js
// snowpack.config.js
// [npm install @snowpack/plugin-webpack]
{
  "plugins": [["@snowpack/plugin-webpack", {/* ... */}]]
}
```

You can extend the default webpack configuration to customize your bundled output:

```js
// snowpack.config.js
// [npm install @snowpack/plugin-webpack]
{
  "plugins": [["@snowpack/plugin-webpack", {
    extendConfig: (webpackConfig) {
      /* ... */
      return webpackConfig;
    }
  }]]
}
``` -->
