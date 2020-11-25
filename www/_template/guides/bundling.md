---
layout: layouts/content.njk
title: Bundling your Snowpack site for production
tags: guides
---

`snowpack build` is fine for many projects, but you also may still want to bundle to optimize code, especially with large projects. Snowpack handles legacy browser support, code minification, code-splitting, tree-shaking, dead code elimination, and other performance optimizations via bundling. In this step you'll install the Webpack plugin and use it to build our project.

Snowpack's bundling philosophy is that **you should be able to use a bundler because you want to, and not because you need to.** Snowpack treats bundling as an optional production optimization, which means you're free to skip over the extra complexity of bundling until you need it.

Bundlers normally require dozens or even hundreds of lines of configuration, but with Snowpack it's just a one-line plugin with no configuration required. This is possible because Snowpack builds your application _before_ sending it to the bundler, so the bundler never sees your custom source code (JSX, TS, Svelte, Vue, etc.) and instead needs to worry only about building common HTML, CSS, and JS.

First install the Webpack plugin with the following command:

```bash
npm install @snowpack/plugin-webpack --save-dev
```

To tell Snowpack to use it, you'll need to create a configuration file. Create a file named `snowpack.config.js`

```js
// Bundlers plugins are pre-configured to work with Snowpack apps.
// No config required!

module.exports = {
  plugins: ['@snowpack/plugin-webpack'],
};
```

Again run

```bash
npm run build
```

> 💡 Tip: Want to optimize your site code without a bundler? Check out our plugin-optimize.
