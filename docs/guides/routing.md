---
layout: ../../layouts/content.astro
title: Routing
published: true
description: This guide will walk you through some common routing scenarios and how to configure the routes option to support them in development.
---

As a web build tool, Snowpack has no knowledge of how (or where) your application is served in production. But Snowpack's dev server can be customized to recreate something close to your production environment for local development.

This guide will walk you through some common routing scenarios and how to configure the `routes` option to support them in development.

### Scenario 1: SPA Fallback Paths

Single Page Applications (SPA) give the client application complete control over routing logic. The web host itself has no idea what is a valid route and what is a 404, since that logic lives completely in the client. Therefore, every route (valid or not) must be served the same HTML response that will load and run the HTML/JS/CSS application in the browser. This special file is called the "SPA Fallback".

To implement this pattern, you'll want to define a single "catch-all" route for development:

```js
// snowpack.config.mjs
export default {
  routes: [
    {
      match: 'routes',
      src: '.*',
      dest: '/index.html',
    },
  ],
};
```

This tells Snowpack's dev server to serve the fallback `/index.html` URL for all routes (`.*` in RegEx means "match everything").

`"match": "routes"` refers to all URLs that either do not include a file extension or that include the ".html" file extension. If you changed the above example to `"match": "all"` instead, then all URLs (including JS, CSS, Image files and more) would respond with the fallback HTML file.

### Scenario 2: Proxy API Paths

Many modern frontend applications will talk directly to an API. Often this API is hosted as a separate application at another domain (ex: `api.example.com/users`) and no special server configuration is needed to talk with it. However in some cases, your API may be hosted at the same domain as your website using a different path scheme (ex: `www.example.com/api/users`).

To serve the correct API response to a URL like `/api/users` in development, you can configure Snowpack to proxy some requests to another server. In this example, we'll proxy all "/api/\*" requests to another server that we have running locally on port `3001`:

```js
// snowpack.config.mjs
import proxy from 'http2-proxy';

export default {
  routes: [
    {
      src: '/api/.*',
      dest: (req, res) => {
        // remove /api prefix (optional)
        req.url = req.url.replace(/^\/api\//, '/');

        return proxy.web(req, res, {
          hostname: 'localhost',
          port: 3001,
        });
      },
    },
  ],
};
```

We recommend the [http2-proxy](https://www.npmjs.com/package/http2-proxy) library for proxying requests to another server, which supports a wide range of options to customize how each request is proxied. But feel free to implement the `dest` proxy function however you like. Your own server logic could even be called directly inside of the `dest` function, however this is not recommended over proxying.

### Scenario 3: Proxy WebSocket Requests

Proxied requests can be upgraded to a WebSocket connection via the "upgrade" event handler. This allows you to proxy WebSocket requests through the Snowpack dev server during development. You can learn more about the upgrade mechanism on [MDN Web Docs.](https://developer.mozilla.org/en-US/docs/Web/HTTP/Protocol_upgrade_mechanism#upgrading_to_a_websocket_connection).

```js
// snowpack.config.mjs
import proxy = from 'http2-proxy';

export default {
  routes: [
    {
      src: '/ws',
      upgrade: (req, socket, head) => {
        const defaultWSHandler = (err, req, socket, head) => {
          if (err) {
            console.error('proxy error', err);
            socket.destroy();
          }
        };

        proxy.ws(
          req,
          socket,
          head,
          {
            hostname: 'localhost',
            port: 3001,
          },
          defaultWSHandler,
        );
      },
    },
  ],
};
```

### Scenario 4: Custom Server Rendering

If you only use Snowpack to build assets and rely on your own custom server (ex: Rails, Laravel, etc) for serving HTML, then you probably have no use for routing. Consider reading our guide on [Server-Side Rendering (SSR)](/guides/server-side-render) which explains how to integrate Snowpack into your own server as middleware.
