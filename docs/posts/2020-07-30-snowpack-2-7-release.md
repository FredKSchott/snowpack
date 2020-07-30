---
layout: layouts/post.njk
title: Snowpack 2.7
tagline: v2.7.0 release post
date: 2020-07-30
bannerImage: "/img/banner-2.jpg"
---

Happy release day! We are excited to announce Snowpack v2.7 with a handful of new features focused on stability and ease-of-use:

- **Redesigned plugin API** plus new documentation for plugin authors.
- **Import aliasing** and more new ways to customize Snowpack.
- **Multi-Page Application (MPA)** bundling support.
- **Svelte + TypeScript** template for Create Snowpack App.
- **Bug fixes, usability improvements & more!**

<br/>

Plus, we hit some exciting project milestones in the last month, including:

- ❤️  **150** open source contributors (and growing!)
- 🏆 **1000+** opened discussions, issues, and pull requests
- ⭐️ **10,000+** stars on GitHub
- 👋 **New companies using Snowpack:** [Alibaba](https://www.1688.com/) & [Airhacks](https://airhacks.com/)

<br/>

If you've been waiting for an ~~excuse~~ reason to give Snowpack a try, now is a great time to start! Try out a Create Snowpack App (CSA) template or install Snowpack into any existing project:

``` bash
# install with npm
npm install --save-dev snowpack

# install with yarn
yarn add --dev snowpack
```

## New: Redesigned Plugin API

Snowpack 2.7 ships with support for a new, streamlined plugin API for Snowpack plugins. Completely new use cases are unlocked with the redesigned `load()`, `transform()`, `run()` and `optimize()` plugin hooks.

![webpack vs. snowpack diagram](/img/snowpack-27-screenshot-1.png)

Every plugin hook has been laid out and documented in our new "Plugins" documentation site. The new API is heavily inspired by [Rollup](https://rollupjs.org/), so we hope it already feels familiar to many of you.

We've also redesigned the "build scripts" concept to use the new plugin system under the hood. Build scripts let you connect third-party CLIs directly into Snowpack without the boilerplate of a custom plugin interface or the risk of getting blocked by a missing plugin/feature.

Snowpack 2.7 is fully backwards compatible with older plugins, so you can upgrade without worrying about version mismatches. If you're a plugin author, check out our new dedicated "Plugins" documentation site to learn more.

## Import Aliasing

![webpack vs. snowpack diagram](/img/snowpack-27-screenshot-2.png)

In previous versions of Snowpack, only a certain set of import aliases existed in each project. Now, you can define as many custom import aliases for your project as you'd like. Package import aliases are also supported.

Import Aliasing is just one of many quality of life improvements shipping in this version of Snowpack. Read the full release notes to learn more.

## Multi-Page Application (MPA) Support

Whether you're building a Single-Page App (SPA) with JavaScript or a more traditional website with multiple HTML files, Snowpack is the build tool that just works. In this release we've improved our bundling story to better support multi-page apps.

Starting in Snowpack v2.7, our Webpack plugin will look at all HTML files in your final built application and scan them for JavaScript entrypoints to bundle. This way your entire application is bundled automatically for you, without any complex bundler configuration required.

In addition, [@mxmul](https://github.com/mxmul) (Yelp) has been steadily improving the Webpack plugin with better default settings around optimization and performance. By following the latest guidance from Google, you now get a faster site by just updating a plugin.

## Svelte + TypeScript Support

![webpack vs. snowpack diagram](/img/svelte-ts.png)

Last week, [Svelte announced official support for TypeScript](https://svelte.dev/blog/svelte-and-typescript). We're huge fans of both projects and couldn't pass up the chance to test the new support out in a brand new Svelte + TypeScript app template for Snowpack. Visit Create Snowpack App to see all of our new templates.

## Thank You!

Snowpack wouldn't be possible without the 150+ contributors who contributed features, fixes, and documentation improvements. Thanks again for all of your help.

Follow [@pikapkg](https://twitter.com/pikapkg) on Twitter for updates on new features and release before anyone else.

PS: In case you missed it, check out our latest project: [Skypack](https://www.skypack.dev/) - the new JavaScript CDN that lets you load any npm package directly in the browser.