---
layout: ../../layouts/content.astro
title: 'Sass'
tags: communityGuide
published: true
img: '/img/logos/sass.svg'
imgBackground: '#bf4080'
description: How to use SASS with Snowpack using the Snowpack SASS plugin
---

[Sass](https://www.sass-lang.com/) is a stylesheet language that’s compiled to CSS. It allows you to use variables, nested rules, mixins, functions, and more, all with a fully CSS-compatible syntax. Sass helps keep large stylesheets well-organized and makes it easy to share design within and across projects.

To use Sass with Snowpack, install [@snowpack/plugin-sass](https://www.npmjs.com/package/@snowpack/plugin-sass) (Sass automatically included) and add it to your `snowpack.config.mjs` file. See README on npm or [GitHub](https://github.com/withastro/snowpack/tree/main/plugins/plugin-sass#plugin-options) for plugin options.

```diff
  // snowpack.config.mjs
  export default {
    plugins: [
+    '@snowpack/plugin-sass',
    ],
  };
```
