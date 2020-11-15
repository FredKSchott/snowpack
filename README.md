<a href="https://github.com/snowpackjs/snowpack/actions" align="right">
  <img src="https://github.com/snowpackjs/snowpack/workflows/CI/badge.svg?event=push" alt="CI" />
</a>    
  
<h1>Snowpack</h1>

Snowpack is a modern frontend build tool for faster web development. It replaces heavier, more complex bundlers like webpack or Parcel in your development workflow.

Snowpack leverages JavaScript's native module system (<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import">known as ESM</a>) to create a first-of-its-kind build system that never builds the same file twice. Snowpack pushes changes instantly to the browser, saving you hours of development time traditionally spent waiting around for your bundler.

### Key Features

- Develop faster, with a dev server that starts up in **50ms or less.**
- See changes reflected [instantly in the browser.](https://www.snowpack.dev/posts/#hot-module-replacement)
- Integrate your favorite bundler for a [production-optimized build.](https://www.snowpack.dev/posts/#snowpack-build)
- Enjoy out-of-the-box support for [TypeScript, JSX, CSS Modules and more.](https://www.snowpack.dev/posts/#features)
- Connect your favorite tools with [third-party plugins.](https://www.snowpack.dev/posts/#build-plugins)

**💁 More info at the official [Snowpack website ➞](https://snowpack.dev)**

<a href="https://osawards.com/javascript/2020">
  <img src="https://www.snowpack.dev/img/JSAwardWinner.png"  height="72px" />
</a>

## Community

[Join our Discord](https://discord.gg/rS8SnRk) for discussion, questions about Snowpack or related Pika projects, or to show off what you’re working on!

## Create Snowpack App (CSA)

For starter apps and templates, see [create-snowpack-app](./create-snowpack-app).

## Official Snowpack Plugins

### Dev Environment

- [@snowpack/plugin-dotenv](./plugins/plugin-dotenv)
- [@snowpack/plugin-typescript](./plugins/plugin-typescript)

### Build

- [@snowpack/plugin-babel](./plugins/plugin-babel)
- [@snowpack/plugin-svelte](./plugins/plugin-svelte)
- [@snowpack/plugin-vue](./plugins/plugin-vue)
- [@snowpack/plugin-sass](./plugins/plugin-sass)

### Transform

- [@snowpack/plugin-postcss](./plugins/plugin-postcss)
- [@snowpack/plugin-react-refresh](./plugins/plugin-react-refresh)

### Bundle

- [@snowpack/plugin-webpack](./plugins/plugin-webpack)

### Utility Plugins

- [@snowpack/plugin-build-script](./plugins/plugin-build-script)
- [@snowpack/plugin-run-script](./plugins/plugin-run-script)

## Featured Community Plugins

- [snowpack-plugin-rollup-bundle](https://github.com/ParamagicDev/snowpack-plugin-rollup-bundle)
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
- [snowpack-plugin-relative-css-urls](https://github.com/canadaduane/snowpack-plugin-relative-css-urls) Keep your image assets and CSS together within the same component directories.
- [snowpack-plugin-replace](https://github.com/moonrailgun/snowpack-plugin-replace) A plugin for replace file content with `string` or `RegExp`, useful for migrate or make some magic without modify source code
- [snowpack-plugin-elm](https://github.com/marc136/snowpack-plugin-elm) A plugin to compile [Elm apps and modules](https://elm-lang.org).
- PRs that add a link to this list are welcome!
