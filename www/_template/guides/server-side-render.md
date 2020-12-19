---
layout: layouts/content.njk
title: Server-Side Rendering (SSR)
description: This guide will walk you through three different options for setting up Snowpack with your own custom server.
published: true
---

Server-side rendering (SSR) refers to several similar developer stories:

- Using Snowpack with a server web framework like Rails or Express
- Using Snowpack with a server-side frontend framework kit like Next.js or SvelteKit
- Any site configuration where your HTML is generated at runtime, outside of your static build.

This guide will walk you through two options for setting up Snowpack with your own custom server:

1. `snowpack build --watch` - Load files out of the static build directory
2. `startDevServer({ ... })` - Load files on-demand via Snowpack's JavaScript API

### Option 1: Static

Serving built files directly out of Snowpack's `build/` directory is the easiest way to get started with Snowpack. Run `snowpack build` to build your site to a static directory, and then make sure that your HTML server response includes the appropriate `script` & `link` tags to load your Snowpack-built JavaScript and CSS:

```html
<!-- Example: If you own the server HTML response, make sure that you host the built assets and load the correct JS/CSS files in your HTML.  -->
<script type="module" src="/dist/index.js"></script>
```

During development, Snowpack will rebuild files on every change thanks to the `--watch` command. To enable dev features like automatic page reloads and hot module replacement (HMR), check out the ["Custom Server" section](/guides/hmr#enable-hmr%3A-custom-server) of our HMR guide for more info.

This setup also has the benefit of pulling from the same `build/` directory in both development and production. You can control this `build/` output behavior yourself by passing different `--out` CLI flags to Snowpack for development vs production. You can even pass entirely different config files via the `--config` CLI flag, or put custom logic in your `snowpack.config.js` file to behave differently for different builds.

The downside of this static approach is that you need to wait for Snowpack to build the entire `build/` directory on startup before your site will run. This is something that all other build tools (like Webpack) have to deal with, but Snowpack has the ability to build files only when they are requested by the browser, leading to ~0ms startup wait time.

### Option 2: On Demand (Middleware)

<div class="notification">
Status: Experimental
</div>

The best developer experience is achieved by loading files on-demand. This removes any need for work on startup, giving you a faster developer environment no matter how large your project grows.

```js
import {startDevServer} from 'snowpack';
const server = await startDevServer({ ... });

// Example: Express
// On request, build each file on request and respond with its built contents
app.use((req, res, next) => {
  try {
    const buildResult = await server.loadUrl(req.url);
    res.send(buildResult.contents);
  } catch (err) {
    next(err);
  }
});
```

Note that you'll still need to set up static file serving out of the `build/` directory for production deployments. For that reason, this can be seen as an enhancement over the static setup in Option 1 for faster development speeds.

While our official API is written in JavaScript and requires Node.js to run, you could implement your own API for any language/environment using the `snowpack dev` CLI command to start the server and loading assets directly by fetching each URL.
