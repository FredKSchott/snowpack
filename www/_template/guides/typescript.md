---
layout: layouts/main.njk
title: TypeScript
tags: guides
---

## TypeScript

Snowpack includes built-in support to build all TypeScript source files (`.ts` & `.tsx`) in your application.

For automatic TypeScript type checking during development, add the official [@snowpack/plugin-typescript](https://www.npmjs.com/package/@snowpack/plugin-typescript) plugin to your Snowpack config file. This plugin adds automatic `tsc` type checking results right in the Snowpack dev console.

```js
// snowpack.config.json
"plugins": ["@snowpack/plugin-typescript"]
```
