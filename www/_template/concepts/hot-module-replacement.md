---
layout: layouts/main.njk
title: Fast Refresh & HMR
---

Hot Module Replacement (HMR) is the ability to push file updates to the browser without triggering a full page refresh. Imagine changing some CSS, hitting save, and then instantly seeing your change reflected on the page without a refresh. That's HMR.

Snowpack supports full HMR out-of-the-box for the following served files:

- CSS
- CSS Modules
- JSON

Popular frameworks can also be set up for HMR. **[Create Snowpack App (CSA)](https://github.com/snowpackjs/snowpack/blob/main/create-snowpack-app) ships with HMR enabled by default for all of the following frameworks.** If you're not using CSA, you can setup HMR in your application with a simple plugin or a few lines of code:

- Preact: [@prefresh/snowpack](https://www.npmjs.com/package/@prefresh/snowpack)
- React: [@snowpack/plugin-react-refresh](https://www.npmjs.com/package/@snowpack/plugin-react-refresh)
- Svelte: [A few lines of code](https://github.com/snowpackjs/snowpack/blob/main/create-snowpack-app/app-template-svelte/src/index.js#L9-L16)
- Vue: [A few lines of code](https://github.com/snowpackjs/snowpack/blob/main/create-snowpack-app/app-template-vue/src/index.js#L7-L14)

For more advanced HMR integrations, Snowpack created the [esm-hmr spec](https://github.com/snowpackjs/esm-hmr), a standard HMR API for any ESM-based dev environment:

```js
// HMR Code Snippet Example
if (import.meta.hot) {
  import.meta.hot.accept(({module}) => {
    // Accept the module, apply it into your application.
  });
}
```

Check out the full [ESM-HMR API reference](https://github.com/snowpackjs/esm-hmr) on GitHub.
