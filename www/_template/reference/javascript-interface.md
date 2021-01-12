---
layout: layouts/content.njk
title: JavaScript API
description: Snowpack's JavaScript API is for anyone who wants to integrate with some custom build pipeline or server-side rendering engine.
---

```js
// JS API Example
import {startServer} from 'snowpack';
const server = await startServer({ ... });
```

Snowpack is most commonly used via the command-line. However, Snowpack also ships a JavaScript API for anyone to integrate with or build on top of.

This documentation is still in progress. However, the TypeScript type declarations give a good summary of the current JS API: https://unpkg.com/browse/snowpack@^3.0.0/lib/index.d.ts
