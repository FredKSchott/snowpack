---
layout: layouts/content.njk
title: 'PostCSS'
tags: communityGuide
published: true
img: '/img/logos/postcss.svg'
imgBackground: '#f8f8f2'
description: How to use PostCSS in your Snowpack project.
---

<div class="stub">
This article is a stub, you can help expand it into <a href="https://documentation.divio.com/how-to-guides/">guide format</a>
</div>


[PostCSS](https://postcss.org/) is a popular CSS transpiler with a support for a large ecosystem of plugins.

**To use PostCSS with Snowpack:** add [@snowpack/plugin-postcss](https://www.npmjs.com/package/@snowpack/plugin-postcss) to your project.

```diff
// snowpack.config.js
"plugins": [
+  "@snowpack/plugin-postcss"
]
```

PostCSS then requires a [`postcss.config.js`](https://github.com/postcss/postcss#usage) file in the top-level of your package to customize how your CSS will be transformed. You can customize where this config file is loaded from by using the `config` plugin option. See [the plugin README](https://www.npmjs.com/package/@snowpack/plugin-postcss) for all available options.

```js
// postcss.config.js
// Example (empty) postcss config file
module.exports = {
  plugins: [
    // ...
  ]
}
```

Be aware that this plugin will transform all built CSS in your project, including any files that compiled to CSS (like `.scss` Sass files, for example).
