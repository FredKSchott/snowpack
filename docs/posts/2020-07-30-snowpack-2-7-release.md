---
layout: layouts/post.njk
title: Snowpack 2.7
tagline: v2.7.0 release post
date: 2020-07-30
bannerImage: '/img/banner-2.jpg'
---

Happy release day! We are excited to announce Snowpack v2.7 with a handful of new features focused on stability and ease-of-use:

- **Redesigned plugin API** plus [new guides](/plugins) for plugin authors
- **Import aliasing** and new ways to customize Snowpack
- **Multi-Page Application (MPA)** webpack bundling support
- **New [Svelte + TypeScript](https://svelte.dev/blog/svelte-and-typescript)** app template
- **Bug fixes, usability improvements & more!**

<br/>

Plus, we hit some VERY exciting project milestones last month:

- ❤️ **150** [open source contributors](https://github.com/pikapkg/snowpack/graphs/contributors) (and growing!)
- 🏆 **1000+** opened discussions, issues, and pull requests
- ⭐️ <strike>10,000</strike> **11,000+** stars on GitHub
- 👋 **New companies using Snowpack:** [Alibaba](https://www.1688.com/) & [Airhacks](https://airhacks.com/)

<br/>

If you've been waiting for an ~~excuse~~ reason to give Snowpack a try, now is a great time to start. Try out a Create Snowpack App (CSA) template or install Snowpack into any existing project:

```bash
# install with npm
npm install --save-dev snowpack

# install with yarn
yarn add --dev snowpack
```

## New: Redesigned Plugin API

After listening to user feedback, we believe the future of Snowpack is plugins. They’re easier to load, and enable Snowpack to do more. So we rewrote many parts of Snowpack core to expose more power to plugins, while keeping the API simple enough for anyone to write their own. Snowpack 2.7 ships with a new, streamlined plugin API for Snowpack plugins. We now **support loading any file imaginable in Snowpack** through the use of plugins (if a plugin doesn’t exist yet, [suggest one](https://github.com/pikapkg/snowpack/discussions) or [add it yourself!](https://github.com/pikapkg/snowpack/pulls)). We’ve also added new hooks like `load()`, `transform()`, `run()`, and `optimize()` to further give more control.

![snowpack screenshot](/img/snowpack-27-screenshot-1.png)

Every hook is documented in our new [Plugins Guide](/plugins) for plugin authors. The new API is heavily inspired by [Rollup](https://rollupjs.org/), so we hope the basic concepts already feel familiar to many of you. We’ve also added some exciting new ideas that make plugin authoring easy while keeping Snowpack performance speedy (such as the `resolve` object that helps Snowpack optimize plugin execution in dev and build).

Snowpack 2.7 is fully backwards compatible with older plugins, so you can upgrade without worrying about version mismatches. If you're a plugin author, check out our new dedicated [Plugins documentation](/plugins) to learn more. And for Snowpack users, we hope the change to plugins over scripts will be a welcome simplification to your workflow.

## New: Import Aliasing

![snowpack screenshot](/img/snowpack-27-screenshot-2.png)

In previous versions of Snowpack, import aliasing was hard to understand and configure (and it didn’t support all types of aliasing). Starting in Snowpack v2.7, [Import Aliases](/#import-aliases) get a new top-level config so that you can define as many custom aliases as you'd like. Package import aliases are also supported.

## Simplified Configuration

![snowpack screenshot](/img/snowpack-27-screenshot-3.png)

As Snowpack moves more-and-more toward plugins, we’ve made using `scripts` (`build:*`, `mount:*`, etc.) completely optional. We now support a new [mount config](/#mount-options) for mounting your directories, and have deferred the rest to build plugins.

We will support `scripts` through Snowpack 2 if you like them! We’ve also released 2 new plugins—`@snowpack/plugin-build-script` and `@snowpack/plugin-run-script`—to achieve the same result. You also might like using these if you need to tap into Snowpack's build pipeline without the boilerplate of a custom plugin interface or the risk of getting blocked by a missing plugin feature.

## Multi-Page Application (MPA) Support + improved webpack plugin performance

Whether you're building a Single-Page App (SPA) with JavaScript or a more traditional website with multiple HTML files, Snowpack is the build tool that just works. In this release we've improved our bundling story to better support multi-page apps.

Starting in Snowpack v2.7, our webpack plugin will look at all HTML files in your final built application and scan them for JavaScript entrypoints to bundle. This way your entire application is bundled automatically for you, without any complex bundler configuration required.

In addition, [@mxmul](https://github.com/mxmul) (Yelp) released granular chunking for `@snowpack/plugin-webpack` with improved performance following the [latest research from Google](https://web.dev/granular-chunking-nextjs/). If you were using Snowpack + webpack, you get a faster site by just updating a plugin!

## Svelte + TypeScript Support

![snowpack screenshot](/img/svelte-ts.png)

Last week, [Svelte announced official support for TypeScript](https://svelte.dev/blog/svelte-and-typescript). We're huge fans of both projects and couldn't pass up the chance to test the new support out in a brand new Svelte + TypeScript app template for Snowpack.

Visit [Create Snowpack App](https://github.com/pikapkg/snowpack/tree/master/packages/create-snowpack-app) for a list of all of our new app templates.

## Unbundled performance improvements

If you’ve been following the development of Snowpack, you probably know it uses [esbuild](https://github.com/evanw/esbuild) under-the-hood, a super-fast JS parser written in Go. Snowpack 2.7 updates to the latest version of esbuild to take advantage of the latest improvements and features there.

2.7 improves Snowpack’s bundleless performance by automatically minifying all your code (even your dependencies). And thanks to esbuild, you probably won’t even notice an increase in build times. We disable this behavior if you opt in to using a bundler, but you can also control this with `buildOptions.minify` ([docs](https://www.snowpack.dev/#build-options)).

We have more exciting unbundled performance improvements coming soon—stay tuned!

## Thank You, Contributors!

Snowpack wouldn't be possible without the [150+ contributors](https://github.com/pikapkg/snowpack/graphs/contributors) who contributed features, fixes, and documentation improvements. Thanks again for all of your help.

-- Snowpack Maintainers

<div class="notification">
Psst... In case you missed it, <a href="https://www.skypack.dev/">check out our latest project: Skypack</a> - the new JavaScript CDN that lets you load any npm package directly in the browser.
</div>

<a href="https://twitter.com/pikapkg" target="_blank">
<svg aria-hidden="true" width="32" focusable="false" data-prefix="fab" data-icon="twitter" class="svg-inline--fa fa-twitter fa-w-16" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z"></path></svg>
<a href="https://twitter.com/pikapkg">Follow @pikapkg on Twitter and don't miss future updates!</a>
</a>
