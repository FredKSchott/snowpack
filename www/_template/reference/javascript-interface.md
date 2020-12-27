---
layout: layouts/content.njk
title: JavaScript API
description: Snowpack's JavaScript API is for anyone who wants to integrate with some custom build pipeline or server-side rendering engine.
---

<div class="notification">
Status: Experimental
</div>

```js
// JS API Example
import {startDevServer} from 'snowpack';
const server = await startDevServer({ ... });
```

Snowpack is most commonly used via the command-line. However, Snowpack also ships a JavaScript API for anyone who wants to integrate with some custom build pipeline or server-side rendering engine.

For example, [SvelteKit](https://svelte.dev/blog/whats-the-deal-with-sveltekit) -- the Svelte team's official app framework -- uses Snowpack's JavaScript API to build a custom SSR engine on top of Snowpack.

### API Reference

This documentation is still in progress as we prepare for Snowpack v3.0. For now, visit the TypeScript type declarations to see a full summary of the current JS API: https://github.com/snowpackjs/snowpack/blob/main/snowpack/src/types.ts#L197-L245
