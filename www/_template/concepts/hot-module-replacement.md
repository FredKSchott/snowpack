---
layout: layouts/content.njk
title: Fast Refresh & HMR
---

Hot Module Replacement (HMR) is the ability to push file updates to the browser without triggering a full page refresh. Imagine changing some CSS, hitting save, and then instantly seeing your change reflected on the page without a refresh. That's HMR.

HMR is not unique to Snowpack. However, Snowpack's approach to [unbundled development](/concepts/how-snowpack-works) and ability to leverage ESM for direct file updates makes HMR significantly faster than it would be in a traditional bundled dev environment.

Snowpack ships with ready, out-of-the-box HMR support for the following files in development:

- CSS
- CSS Modules
- JSON

In addition, Snowpack also supports **Fast Refresh** for most popular frameworks like React, Preact and Svelte. Fast Refresh is a framework-specific enhancement to HMR, which applies single file updates in a way that preserves component state across updates. Changes to a `Timer` component, for example, would be applied without resetting the components internal state. 

Fast Refresh makes your development even faster, especially when working on popups and other secondary view states that normally would require a click to re-open or re-visit after every change.



### Enabling HMR with Fast Refresh

All popular frameworks are HMR-ready in Snowpack. **[Create Snowpack App (CSA)](https://github.com/snowpackjs/snowpack/blob/main/create-snowpack-app) ships with HMR enabled by default for all of the following frameworks.** Otherwise, you can setup HMR in your own application with just a plugin and/or a few lines of code:

- Preact: [@prefresh/snowpack](https://www.npmjs.com/package/@prefresh/snowpack)
- React: [@snowpack/plugin-react-refresh](https://www.npmjs.com/package/@snowpack/plugin-react-refresh)
- Svelte: [@snowpack/plugin-svelte](https://www.npmjs.com/package/@snowpack/plugin-svelte)
- Vue (HMR only): [A few lines of code](https://github.com/snowpackjs/snowpack/blob/main/create-snowpack-app/app-template-vue/src/index.js#L7-L14)

For more advanced HMR integrations, Snowpack created the [esm-hmr spec](https://github.com/snowpackjs/esm-hmr), a standard HMR API for any ESM-based dev environment:

```js
// HMR Code Snippet Example
if (import.meta.hot) {
  import.meta.hot.accept(({ module }) => {
    // Accept the module, apply it into your application.
  });
}
```

Check out the full [ESM-HMR API reference](https://github.com/snowpackjs/esm-hmr) on GitHub.
