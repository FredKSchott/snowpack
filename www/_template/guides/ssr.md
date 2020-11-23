---
layout: layouts/main.njk
title: SSR
---

SSR for Snowpack is supported but fairly new and experimental. This documentation will be updated as we finalize support over the next few minor versions.

```js
// New in Snowpack v2.15.0 - JS API Example
import {startDevServer} from 'snowpack';
const server = await startDevServer({ ... });
```

These frameworks have known experiments / examples of using SSR + Snowpack:

- React (Example): https://github.com/matthoffner/snowpack-react-ssr
- Svelte/Sapper (Experiment): https://github.com/Rich-Harris/snowpack-svelte-ssr
- [Join our Discord](https://discord.gg/rS8SnRk) if you're interested in getting involved!

To connect your own server to `snowpack dev` for SSR, there are a few things that you'll need to set up. Make sure that you include any Snowpack-built resources via script tags in your server's HTML response:

```html
<!-- Example: Create Snowpack App builds your src/ directory to the /_dist_/* directory -->
<script type="module" src="http://localhost:8080/_dist_/index.js"></script>
```

And make sure that your HTML response also includes code to configure HMR to talk to Snowpack's dev server:

```html
<!-- Configure Snowpack's HMR connection yourself, somewhere on your page HTML -->
<script>
  window.HMR_WEBSOCKET_URL = 'ws://localhost:8080';
</script>
```
