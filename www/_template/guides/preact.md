---
layout: layouts/content.njk
title: Preact
tags: communityGuide
---

## Preact

You can import and use Preact without any custom configuration needed.

**To use `preact/compat`:** (the Preact+React compatability layer) alias the "compat" package to React in your install options:

```js
// Example: Lets you import "react" in your application, but uses preact internally
// snowpack.config.json
"installOptions": {
  "alias": {
    "react": "preact/compat",
    "react-dom": "preact/compat"
  }
}
```
