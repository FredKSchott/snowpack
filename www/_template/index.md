---
layout: layouts/main.njk

# Using Snowpack? Want to be featured on snowpack.dev?
# Add your project, organization, or company to the end of this list!
usersList:
  - ia:
    name: The Internet Archive
    img: https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Internet_Archive_logo_and_wordmark.svg/1200px-Internet_Archive_logo_and_wordmark.svg.png
    url: https://github.com/internetarchive/dweb-archive
  - 1688:
    name: Alibaba 1688
    img: https://s.cafebazaar.ir/1/icons/com.alibaba.intl.android.apps.poseidon_512x512.png
    url: https://www.1688.com
  - intel:
    name: Intel
    img: https://upload.wikimedia.org/wikipedia/commons/4/4e/Intel_logo_%282006%29.svg
    url: https://twitter.com/kennethrohde/status/1227273971831332865
  - circlehd.com:
    name: CircleHD
    img: https://www.circlehd.com/img/logo-sm.svg
    url: https://www.circlehd.com/
  - Svelvet:
    name: Svelvet
    img: https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/240/apple/237/spool-of-thread_1f9f5.png
    url: https://github.com/jakedeichert/svelvet
  - pika:
    name: Pika.dev
    img: https://www.pika.dev/static/img/logo5.svg
    url: https://www.pika.dev
  - Toast:
    name: Toast
    img: https://www.toast.dev/toast-icon-300.png
    url: https://www.toast.dev
  - maskable:
    name: Maskable.app
    img: https://maskable.app/favicon/favicon_196.png
    url: https://maskable.app/
  - web-skills:
    name: Web Skills
    img: https://andreasbm.github.io/web-skills/www/icon.svg
    url: https://andreasbm.github.io/web-skills
  - swissdev-javascript:
    name: SwissDev JavaScript Jobs
    img: https://static.swissdevjobs.ch/pictures/swissdev-javascript-jobs.svg
    url: https://swissdevjobs.ch/jobs/JavaScript/All
  - tradie-training:
    name: Tradie Training
    img: https://tt.edu.au/images/logo.png
    url: https://tt.edu.au
  - wemake-services:
    name: wemake.services
    img: https://avatars0.githubusercontent.com/u/19639014?s=200&v=4
    url: https://github.com/wemake-services
  - airhacks.com:
    name: airhacks.com
    img: https://airhacks.com/logo.svg
    url: https://airhacks.com
  - tongdun:
    name: tongdun
    img: https://www.tongdun.cn/static/favicon.ico
    url: https://www.tongdun.cn/
  - blessing-skin:
    name: Blessing Skin
    img: https://blessing.netlify.app/logo.png
    url: https://github.com/bs-community
---

## Overview

### What is Snowpack?

Snowpack is a modern frontend build tool for faster web development. It replaces heavier, more complex bundlers like webpack or Parcel in your development workflow.

Snowpack leverages JavaScript's native module system (<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import">known as ESM</a>) to create a first-of-its-kind build system that never builds the same file twice. Snowpack pushes changes instantly to the browser, saving you hours of development time traditionally spent waiting around for your bundler.

### Key Features

- Develop faster, with a dev server that starts up in **50ms or less.**
- See changes reflected [instantly in the browser.](/#hot-module-replacement)
- Integrate your favorite bundler for a [production-optimized build.](/#bundle-for-production)
- Enjoy out-of-the-box support for [TypeScript, JSX, CSS Modules and more.](/#features)
- Connect your favorite tools with [third-party plugins.](/#plugins)

### Who's Using Snowpack?

<div class="company-logos">
{% for user in usersList %}
  <a href="{{ user.url }}" target="_blank" rel="noopener noreferrer nofollow">
    {% if user.img %}<img class="company-logo" src="{{ user.img }}" alt="{{ user.name }}" />
    {% else %}<span>{{ user.name }}</span>
    {% endif %}
  </a>
{% endfor %}
<a href="https://github.com/snowpackjs/snowpack/edit/master/docs/docs/00.md" target="_blank" title="Add Your Project/Company!" class="add-company-button" >
  <svg style="height: 22px; margin-right: 8px;" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="plus" class="company-logo" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path></svg>
  Add your logo
</a>
</div>

### How Snowpack Works

**Snowpack is a modern, lightweight build tool for faster web development.** Traditional JavaScript build tools like webpack and Parcel need to rebuild & rebundle entire chunks of your application every time you save a single file. This rebundling step introduces lag between hitting save on your changes and seeing them reflected in the browser.

Snowpack serves your application **unbundled during development.** Every file only needs to be built once and then is cached forever. When a file changes, Snowpack rebuilds that single file. There's no time wasted re-bundling every change, just instant updates in the browser (made even faster via [Hot-Module Replacement (HMR)](#hot-module-replacement)). You can read more about this approach in our [Snowpack 2.0 Release Post.](/posts/2020-05-26-snowpack-2-0-release/)

Snowpack's **unbundled development** still supports the same **bundled builds** that you're used to for production. When you go to build your application for production, you can plug in your favorite bundler via an official Snowpack plugin for Webpack or Rollup (coming soon). With Snowpack already handling your build, there's no complex bundler config required.

**Snowpack gets you the best of both worlds:** fast, unbundled development with optimized performance in your bundled production builds.

### Library Support

<div class="grid-list">

- React
- Preact
- Svelte
- Vue
- lit-html
- lit-element
- Styled Components
- Tailwind CSS
- [and more!](/#recipes)
<!-- Missing something? Feel free to add your own! -->

</div>

### Tooling Support

<div class="grid-list">

- Babel
- TypeScript
- PostCSS
- Sass
- esbuild
- 11ty
- [and more!](/#recipes)
<!-- Missing something? Feel free to add your own! -->

</div>

### Browser Support

**Snowpack builds your site for both modern and legacy browsers. Even IE11 is supported.** You can control and customize this behavior with the ["browserlist" package.json property](https://css-tricks.com/browserlist-good-idea/).

The only requirement is that _during development_ you use a [modern browser](http://caniuse.com/#feat=es6-module). Any recent release of Firefox, Chrome, or Edge will do. This is required to support the modern, bundle-free ESM imports that load your application in the browser.

### Community

<a href="https://discord.gg/zxSwN8Z"><img alt="Join us on Discord!" src="https://img.shields.io/discord/712696926406967308.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2" style="height: 24px; border: none;"/></a>

[Join the Pika Discord](https://discord.gg/rS8SnRk) for discussion, questions about Snowpack or related Pika projects, or to show off what you’re working on!

## Main Concepts

### Unbundled Development - I'm unsure about where this would fit in the new IA

![webpack vs. snowpack diagram](/img/snowpack-unbundled-example-3.png)

**Unbundled development** is the idea of shipping individual files to the browser during development. Files can still be built with your favorite tools (like Babel, TypeScript, Sass) and then loaded individually in the browser with dependencies thanks to ESM `import` and `export` syntax. Any time you change a file, Snowpack only ever needs to rebuild that single file.

The alternative is **bundled development.** Almost every popular JavaScript build tool today focuses on bundled development. Running your entire application through a bundler introduces additional work and complexity to your dev workflow that is unnecessary now that ESM is widely supported. Every change -- on every save -- must be rebundled with the rest of your application before your changes can be reflected in your browser.

Unbundled development has several advantages over the traditional bundled development approach:

- Single-file builds are fast.
- Single-file builds are deterministic.
- Single-file builds are easier to debug.
- Project size doesn’t affect dev speed.
- Individual files cache better.

That last point is key: **Every file is built individually and cached indefinitely.** Your dev environment will never build a file more than once and your browser will never download a file twice (until it changes). This is the real power of unbundled development.

### Using NPM Dependencies - Add to Getting Started or create a guide for this?

NPM packages are mainly published using a module syntax (Common.js, or CJS) that can't run on the web without some build processing. Even if you write your application using browser-native ESM `import` and `export` statements that would all run directly in the browser, trying to import any one npm package will force you back into bundled development.

**Snowpack takes a different approach:** Instead of bundling your entire application for this one requirement, Snowpack processes your dependencies separately. Here's how it works:

```
node_modules/react/**/*     -> http://localhost:3000/web_modules/react.js
node_modules/react-dom/**/* -> http://localhost:3000/web_modules/react-dom.js
```

1. Snowpack scans your website/application for all used npm packages.
2. Snowpack reads these installed dependencies from your `node_modules` directory.
3. Snowpack bundles all of your dependencies separately into single JavaScript files. For example: `react` and `react-dom` are converted to `react.js` and `react-dom.js`, respectively.
4. Each resulting file can be run directly in the browser, and imported via ESM `import` statements.
5. Because your dependencies rarely change, Snowpack rarely needs to rebuild them.

After Snowpack builds your dependencies, any package can be imported and run directly in the browser with zero additional bundling or tooling required. This ability to import npm packages natively in the browser (without a bundler) is the foundation that all unbundled development and the rest of Snowpack is built on top of.

```html
<!-- This runs directly in the browser with `snowpack dev` -->
<body>
  <script type="module">
    import React from 'react';
    console.log(React);
  </script>
</body>
```

### Snowpack's Dev Server - Add to Getting Started or create a guide for this?

![dev command output example](/img/snowpack-dev-startup-2.png)

`snowpack dev` - Snowpack's dev server is an instant dev environment for [unbundled development.](#unbundled-development) The dev server will only build a file when it's requested by the browser. That means that Snowpack can start up instantly (usually in **<50ms**) and scale to infinitely large projects without slowing down. In contrast, it's common to see 30+ second dev startup times when building large apps with a traditional bundler.

Snowpack supports JSX & TypeScript source code by default. You can extend your build even further with [custom plugins](#plugins) that connect Snowpack with your favorite build tools: TypeScript, Babel, Vue, Svelte, PostCSS, Sass... go wild!

### Snowpack's Build Pipeline - Add to Getting Started or create a Build/Deployment guide for this?

![build output example](/img/snowpack-build-example.png)

`snowpack build` - When you're ready to deploy your application, run the build command to generate a static production build of your site. Building is tightly integrated with your dev setup so that you are guaranteed to get a near-exact copy of the same code that you saw during development.

### Bundle for Production - Add to Getting Started or create a Build/Deployment guide for this?

**You should be able to use a bundler because you want to, and not because you need to.** That was the original concept that Snowpack was designed to address. Snowpack treats bundling as an optional production optimization, which means you're free to skip over the extra complexity of bundling until you need it.

By default, `snowpack build` will build your site using the same unbundled approach as the `dev` command. This is fine for most projects, but you also may still want to bundle for production. Legacy browser support, code minification, code-splitting, tree-shaking, dead code elimination, and other performance optimizations can all be handled in Snowpack via bundling.

Bundlers normally require dozens or even hundreds of lines of configuration, but with Snowpack it's just a one-line plugin with no config required. This is possible because Snowpack builds your application _before_ sending it to the bundler, so the bundler never sees your custom source code (JSX, TS, Svelte, Vue, etc.) and instead only needs to worry about building common HTML, CSS, and JS.

```js
// Bundlers plugins are pre-configured to work with Snowpack apps.
// No config required!
{
  "plugins": [["@snowpack/plugin-webpack"]]
}
```

See ["Optimized Builds"](/#optimized-builds) for more information about connecting bundled (or unbundled) optimization plugins for your production builds.

## Assets

- [Snowpack Logo (PNG, White)](/assets/snowpack-logo-white.png)
- [Snowpack Logo (PNG, Dark)](/assets/snowpack-logo-dark.png)
- [Snowpack Logo (PNG, Black)](/assets/snowpack-logo-black.png)
- [Snowpack Wordmark (PNG, White)](/assets/snowpack-wordmark-white.png)
- [Snowpack Wordmark (PNG, Black)](/assets/snowpack-wordmark-black.png)
