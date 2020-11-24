---
layout: layouts/main.njk
title: Server-Side Rendering (SSR)
---

<div class="notification">
Status: Experimental 
</div>

Server-side rendering (SSR) refers to several similar developer stories:

- Using Snowpack with a server web framework like Rails or Laravel
- Using Snowpack with a server-side frontend framework kit like Next.js or SvelteKit
- Any site configuration where your HTML is generated at runtime, outside of your static build.

This guide will walk you through two different options for setting up Snowpack with your own custom server:

1. `snowpack build --watch` - Serve Snowpack-built files out of the static build directory
2. `startDevServer({ ... })` - Load files on-demand via Snowpack's JavaScript API

### Option 1: Static

Serving built files directly out of Snowpack's `build/` directory is the easiest way to get started with Snowpack. Run `snowpack build` to build your site to a static directory, and then make sure that your HTML server response includes the appropriate `script` & `link` tags to load your Snowpack-built JavaScript and CSS:

```html
<!-- Example: Include the Snowpack-built `./build/dist/index.js` in your HTML response -->
<script type="module" src="/dist/index.js"></script>
```

During development, Snowpack will rebuild files on every change thanks to the `--watch` command. To enable dev features like automatic page reloads and hot module replacement (HMR), check out the ["Custom Server" section](/guides/hmr#enable-hmr%3A-custom-server) of our HMR guide for more info.

This setup also has the benefit of pulling from the same `build/` directory in both development and production. You can control this `build/` output behavior yourself by passing different `--out` CLI flags to Snowpack for development vs production. You can even pass entirely different config files via the `--config` CLI flag, or put custom logic in your `snowpack.config.js` file to behave differently for different builds.

The downside of this static approach is that you need to wait for Snowpack to build the entire `build/` directory on startup before your site will run. This is something that all other build tools (like Webpack) have to deal with, but Snowpack has the ability to only build files when they are requested by the browser, leading to ~0ms startup wait time.

### Option 2: On-Demand

To load files on-demand, you'll need to leverage Snowpack's JavaScript API:

```js
// JS API Example
import {startDevServer} from 'snowpack';
const server = await startDevServer({ ... });
// On request, build each file on request and respond with its built contents
// Example: res.send(buildResult.contents);
const buildResult = await server.loadUrl(req.url);
```

Note that you'll still need to set up static file serving out of the `build/` directory for production deployments. For that reason, this can be seen as an enhancement over the static setup in Option 1 for faster development speeds.

### Connecting Development Builds

You'll also want to make sure to connect & enable HMR for automatic browser updates on file change.

### Connecting Production Builds

Similar to development, you'll want to make sure that

To connect your custom server to `snowpack dev` for development, make sure that your HTML server response includes `script` & `link` tags to load your Snowpack-built JavaScript and CSS, respectively:

```html
<!-- Example: Load the Snowpack-built `dist/index.js` file in your server HTML response -->
<script type="module" src="/dist/index.js"></script>
```
