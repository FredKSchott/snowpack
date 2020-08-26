<p align="center"><img src="/docs/img/logo.png" alt="logo" width="20%" /></p>
<h1 align="center">Snowpack</h1>
<p align="center">
  <a href="https://github.com/pikapkg/snowpack/actions">
    <img src="https://github.com/pikapkg/snowpack/workflows/CI/badge.svg?event=push" alt="CI" />
  </a>
</p>

---

### What is Snowpack?

**Snowpack is a modern, lightweight toolchain for web application development.** Traditional dev bundlers like webpack or Parcel need to rebuild & rebundle entire chunks of your application every time you save a single file. This introduces lag between changing a file and seeing those changes reflected in the browser, sometimes as slow as several seconds.

Snowpack solves this problem by serving your application **unbundled in development.** Any time you change a file, Snowpack never rebuilds more than a single file. There's no bundling to speak of, just a few milliseconds of single-file rebuilding and then an instant update in the browser via HMR. We call this new approach **O(1) Build Tooling.** You can read more about it in our [Snowpack 2.0 Release Post.](https://www.snowpack.dev/posts/2020-05-26-snowpack-2-0-release/)

When you're ready to deploy your web application to users, you can add back a traditional bundler like Webpack or Parcel. With Snowpack you get bundled & optimized production performance without sacrificing dev speed by adding an unnecessary bundler,

### Key Features

- A dev environment that starts up in **50ms or less.**
- Changes are reflected [instantly in the browser.](https://www.snowpack.dev/posts/2020-05-26-snowpack-2-0-release/#hot-module-replacement)
- Integrates your favorite bundler for [production-optimized builds.](https://www.snowpack.dev/posts/2020-05-26-snowpack-2-0-release/#snowpack-build)
- Out-of-the-box support for [TypeScript, JSX, CSS Modules and more.](https://www.snowpack.dev/posts/2020-05-26-snowpack-2-0-release/#features)
- Connect your favorite tools with [third-party plugins.](https://www.snowpack.dev/posts/2020-05-26-snowpack-2-0-release/#build-plugins)

**💁 More info at the official [Snowpack website ➞](https://snowpack.dev)**

## Community

[Join the Pika Discord](https://discord.gg/rS8SnRk) for discussion, questions about Snowpack or related Pika projects, or to show off what you’re working on!

## Create Snowpack App (CSA)

### Starter Templates

For starter apps and templates, see [create-snowpack-app](./create-snowpack-app).

## Official Snowpack Plugins

### Dev Environment

- [@snowpack/plugin-dotenv](./plugins/plugin-dotenv)

### Build

- [@snowpack/plugin-babel](./plugins/plugin-babel)
- [@snowpack/plugin-svelte](./plugins/plugin-svelte)
- [@snowpack/plugin-vue](./plugins/plugin-vue)

### Transform

- [@snowpack/plugin-postcss](./plugins/plugin-postcss)
- [@snowpack/plugin-react-refresh](./plugins/plugin-react-refresh)

### Bundle

- [@snowpack/plugin-parcel](./plugins/plugin-parcel)
- [@snowpack/plugin-webpack](./plugins/plugin-webpack)

### Advanced Plugins

- [@snowpack/plugin-build-script](./plugins/plugin-build-script)
- [@snowpack/plugin-run-script](./plugins/plugin-run-script)

## Featured Community Plugins

- [@prefresh/snowpack](https://github.com/JoviDeCroock/prefresh)
- [snowpack-plugin-imagemin](https://github.com/jaredLunde/snowpack-plugin-imagemin) Use [imagemin](https://github.com/imagemin/imagemin) to optimize your build images.
- [snowpack-plugin-import-map](https://github.com/zhoukekestar/snowpack-plugin-import-map) A more easy way to map your imports to Pika CDN instead of [import-maps.json](https://github.com/WICG/import-maps).
- [snowpack-plugin-less](https://github.com/fansenze/snowpack-plugin-less) Use the [Less](https://github.com/less/less.js) compiler to build `.less` files from source.
- [snowpack-plugin-mdx](https://github.com/jaredLunde/snowpack-plugin-mdx) Use the [MDX](https://github.com/mdx-js/mdx/tree/master/packages/mdx) compiler to build `.mdx` and `.md` files from source.
- [snowpack-plugin-resize-images](https://github.com/jaredLunde/snowpack-plugin-resize-images) Resize and process your build images with [Sharp](https://sharp.pixelplumbing.com/api-constructor).
- [snowpack-plugin-sass](https://github.com/fansenze/snowpack-plugin-sass) Use the [node-sass](https://github.com/sass/node-sass) to build `.sass/.scss` files from source.
- [snowpack-plugin-svgr](https://github.com/jaredLunde/snowpack-plugin-svgr) Use [SVGR](https://github.com/gregberge/svgr) to transform `.svg` files into React components.
- [snowpack-plugin-stylus](https://github.com/fansenze/snowpack-plugin-stylus) Use the [Stylus](https://github.com/stylus/stylus) compiler to build `.styl` files from source.
- [snowpack-plugin-inliner](https://github.com/fansenze/snowpack-plugin-inliner) A plugin for snowpack which transforms files into base64 URIs.
- PRs that add a link to this list are welcome!
