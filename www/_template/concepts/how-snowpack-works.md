---
layout: layouts/main.njk
title: How Snowpack Works
---

**Snowpack is a modern, lightweight build tool for faster web development.** Traditional JavaScript build tools like webpack and Parcel need to rebuild & rebundle entire chunks of your application every time you save a single file. This rebundling step introduces lag between hitting save on your changes and seeing them reflected in the browser.

Snowpack serves your application **unbundled during development.** Every file only needs to be built once and then is cached forever. When a file changes, Snowpack rebuilds that single file. There's no time wasted re-bundling every change, just instant updates in the browser (made even faster via [Hot-Module Replacement (HMR)](#hot-module-replacement)). You can read more about this approach in our [Snowpack 2.0 Release Post.](/posts/2020-05-26-snowpack-2-0-release/)

Snowpack's **unbundled development** still supports the same **bundled builds** that you're used to for production. When you go to build your application for production, you can plug in your favorite bundler via an official Snowpack plugin for Webpack or Rollup (coming soon). With Snowpack already handling your build, there's no complex bundler config required.

**Snowpack gets you the best of both worlds:** fast, unbundled development with optimized performance in your bundled production builds.
