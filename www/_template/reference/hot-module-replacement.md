---
layout: layouts/content.njk
title: Hot Module Replacement (HMR) API
---

Snowpack implements HMR via the [esm-hmr](https://github.com/pikapkg/esm-hmr) spec, an attempted standard for ESM-based Hot Module Replacement (HMR).

```js
// HMR Code Snippet Example
if (import.meta.hot) {
  import.meta.hot.accept(({ module }) => {
    // Accept the module, apply it into your application.
  });
}
```

Full API Reference: [snowpack/esm-hmr on GithUb](https://github.com/snowpackjs/esm-hmr)

[Learn more](/concepts/hot-module-replacement) about HMR, Fast Refresh, and how it's meant to work in Snowpack.
