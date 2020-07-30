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
- **Improved performance** with smaller, faster builds
- **New Svelte + TypeScript** app templates
- **Bug fixes, usability improvements & more!**

<br/>

Plus, we hit some VERY exciting project milestones last month:

- ❤️ **150** [open source contributors](https://github.com/pikapkg/snowpack/graphs/contributors) (and growing!)
- 🏆 **1000+** opened discussions, issues, and pull requests
- ⭐️ **10,000+** stars on GitHub
- 👋 **New companies using Snowpack:** [Alibaba](https://www.1688.com/) & [Airhacks](https://airhacks.com/)

<br/>

If you've been waiting for an ~~excuse~~ reason to give Snowpack a try, now is a great time to start. Try out a Create Snowpack App (CSA) template or install Snowpack into any existing project:

```bash
# install with npm
npm install --save-dev snowpack

# install with yarn
yarn add --dev snowpack
```

## Redesigned Plugin API

Snowpack v2.7 features an major rewrite of our internal build pipeline to support a more reliable and expressive plugin API. Completely new use cases around file loading and application optimizations are unlocked with the redesigned `load()`, `transform()`, `run()` and `optimize()` plugin hooks (with more on the way in future versions).

![snowpack screenshot](/img/snowpack-27-screenshot-1.png)

Every hook is documented in our new [Plugins Guide](/plugins) for plugin authors. The new API is heavily inspired by [Rollup](https://rollupjs.org/), so we hope it already feels familiar to many of you. 

Snowpack 2.7 is fully backwards compatible with older plugins, so you can upgrade Snowpack without worrying about version mismatches.


## Simplified Configuration

![snowpack screenshot](/img/snowpack-27-screenshot-3.png)

Snowpack v2.0 originally introduced the concept of build `"scripts"` as a way to configure anything from file building to HTTP request proxying. Scripts were flexible, but hard to document and frustrating to debug. 

Our internal plugin rewrite presented an opportunity to combine the flexibility of third-party CLI tooling with new, more explicit interface for common configuration. `mount`, `proxy`, and `alias` (see below) are all examples of new options to customize how files are built and served by Snowpack. 

We've also created two new utility plugins to make it easier to connect third-party tooling without needing to write a custom plugin from scratch:

- `@snowpack/plugin-build-script`: Use any CLI to build files for Snowpack.
- `@snowpack/plugin-run-script`: Run arbitrary CLI commands during dev/build.


## New: Import Aliasing

![snowpack screenshot](/img/snowpack-27-screenshot-2.png)

In previous versions of Snowpack, import aliasing was hard to understand and configure (and it didn’t support all types of aliasing). Starting in Snowpack v2.7, [Import Aliases](/#import-aliases) gets a new top-level config so that you can define as many custom aliases as you'd like. Package import aliases are also supported.


## Improved Build Performance

Snowpack's official webpack plugin is now more powerful than ever, with new support for multi-page website bundling and better default performance settings (based on the [latest research from Google](https://web.dev/granular-chunking-nextjs/)). Special shout out to [@mxmul](https://github.com/mxmul) (Yelp) for these community contributions!

If you don't connect a bundler, that's fine too. Your site still gets faster in Snowpack v2.7, with minification now on by default. We plan to keep improving the unbundled production build story over the next few releases, so stay tuned.


## Svelte + TypeScript Support

![snowpack screenshot](/img/svelte-ts.png)

Last week, [Svelte announced official support for TypeScript](https://svelte.dev/blog/svelte-and-typescript). We're huge fans of both projects and couldn't pass up the chance to test the new support out in a brand new Svelte + TypeScript app template for Snowpack.

Visit [Create Snowpack App](https://github.com/pikapkg/snowpack/tree/master/packages/create-snowpack-app) for a list of all of our new app templates.


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
