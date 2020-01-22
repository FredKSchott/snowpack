## Introduction


<p class="notification is-link">
  <strong style="text-decoration: underline">TL;DR</strong> - With Snowpack you can build modern web apps (using React, Vue, etc.) without a bundler (like Webpack, Parcel, Rollup). No more waiting for your bundler to rebuild your site every time you hit save. Instead, every change is reflected in the browser instantly.
</p>


### How It Works


1. Instead of bundling on every change, just run Snowpack **once** right after `npm install`.
2. Snowpack re-installs your dependencies as single JS files to a new `web_modules/` directory. **It never touches your source code.**
3. Write code, import those dependencies via an ESM `import`, and then run it all in the browser.
4. Skip the bundle step and see your changes reflected in the browser immediately after hitting save.
5. Keep using your favorite web frameworks and build tools! Babel & TypeScript supported.

![how it works illustration](/img/how-does-it-work.jpg)

```js
// In a Snowpack application, this runs directly in the browser!
import React from '/web_modules/react.js';

// In a Snowpack application /w Babel:
import React from 'react';
```

### Why?

- Ever been stuck waiting for your webapp to rebuild during development? Ever heard your laptop fans go wild every time you hit save? Then you've experienced the cost of bundling during development. 
- Web bundlers like Webpack are powerful, but they can easily introduce a complex mess of configuration, plugins, and dependencies. Create React App, for example, installs ~200MB of dependencies and uses ~600 lines of Webpack configuration internally.
- Bundlers became a required web development tool in the 2010's, mainly because of npm's use of a module format that didn't run natively in the browser (Common.js). Before then, web developers would commonly ship development source code directly to the browser. Bundling used to be a production-only optimization (vs. the dev-time requirement it is today).
- ESM has had ~5 years to bake in browser, and is now supported in all modern browsers (going back to early 2018). With ESM, bundlers are no longer required. You can build a modern, performant, production-ready web application without Webpack!
- **Replace a rebuild-on-every-change build step (Webpack, Parcel, etc.) with a run-once install step (Snowpack) to get a faster dev environment with less tooling complexity.**


### Who Should Use Snowpack?

- **Beginners!** Popular starter applications usually come with 1000's of dependencies and 100's of lines of bundler configuration that you don't actually need. Snowpack shrinks the number of things you need to learn to get started with web development. Shipping your code directly to the browser also lets you easily inspect your code in the browser, set break-points, etc. for easier feedback loops as you're getting started.
- **Anyone starting a new application!** Snowpack has zero lock-in, so you can always add a traditional bundler later down the road (see our guide below). But until then, you can still use all your other favorite tools like Babel & TypeScript while still getting all the dev speed improvements that come with bundler-free development. 
- **Anyone building an application that doesn't change often!** Have you ever gotten back into a project after a while, and spent 80% of your time at the start just updating outdated dependencies? Less tooling & less configuration means there are fewer opportunities for plugin churn, breaking changes, and deprecation to hurt you.
- **Anyone who thinks web development has gotten too complex!** Less tooling means less to install, less complexity, less to do every time you make a change, and less to debug when something goes wrong. Removing tooling that sits between your editor and the browser also makes your Dev Tools much more useful for live debugging.
- **Anyone who is interested in the future of web development!** Snowpack is just one step towards a future of web development that lets us build more with less complexity and tooling overhead. And this future is here to stay.


### Who Should Avoid Snowpack?

- ~~**Anyone building for older browser**~~ [Snowpack now supports older browsers like IE11!](#runs-in-every-browser)
- **Anyone who loves tooling-heavy development!** This isn't sarcastic, I promise :) By dropping the bundler, you can't do the magic that Webpack is famous for. Using `import` to load CSS, Images, and other non-JS resources is  non-standard and unsupported in the browser (for now). You may appreciate a dev environment that is true to what standard JavaScript browsers support. Or, you may find this annoying.


### Modern Browser Support

<script src="https://cdn.jsdelivr.net/gh/ireade/caniuse-embed/public/caniuse-embed.min.js" async></script>
<p class="ciu_embed" data-feature="es6-module" data-periods="future_1,current,past_1,past_2" data-accessible-colours="false">
  <a href="http://caniuse.com/#feat=es6-module">
  <picture>
    <source type="image/webp" srcset="https://caniuse.bitsofco.de/image/es6-module.webp">
    <img src="https://caniuse.bitsofco.de/image/es6-module.png" alt="Data on support for the es6-module feature across the major browsers from caniuse.com">
  </picture>
  </a>
</p>

By default, Snowpack installs npm dependencies as ES Module (ESM), which run natively [wherever ESM syntax is supported](https://caniuse.com/#feat=es6-module). This includes ~90% of all browsers in use today. **All modern browsers (Firefox, Chrome, Edge, Safari) have supported ESM since early 2018.**

Additionally, Snowpack runs all dependencies through Babel via `@preset/env` to transpile any less-supported language features found in your dependencies. You can customize this behavior by setting your own "browserslist" key in your `package.json` manifest (see below).




### Legacy Browser Support

<p>
<img alt="legacy browser icons" src="/img/browser-logos-all.png" style="
    border: none;
    box-shadow: none;" />
</p>

**As of v1.1, Snowpack also supports legacy browsers via the the `--nomodule` flag!** This is a production-only flag that generates a legacy bundle of your entire application for older browsers that don't understand ESM syntax. Because your application is already built to run in the browser, there's no configuration or extra plugins required to use it.

If you need to support legacy browsers like **IE11**, **UC Browser for Android** (popular in China and India), **Samsung Mobile**, and **Opera Mini** then be sure to enable this feature.

Note that this introduces a production build step into your deployment process, if you don't already have one. This is in addition to Snowpack's "run-only-once-at-install-time" normal behavior, but still much lighter than Webpack/Parcel's "run-on-every-change-at-dev-time" normal behavior.

Read our guide on [Supporting Legacy Browsers](#supporting-legacy-browsers) for more details.


### Load Performance

You can think of Snowpack like an optimized code-splitting strategy for your dependencies. Dependencies are bundled into individual files at install-time, with all internal package files bundled together as efficiently as possible. Any common, shared dependencies are moved into common, shared chunks in your `web_modules/` directory. 

But make no mistake: unbundled applications have a different performance story than bundled applications. Cache efficiency improves significantly (especially useful if you deploy multiple times per day) and the risk of shipping duplicate code across bundles goes to zero.

Unlike in traditional bundled applications, long (7+) chains of imports can slow down your first page load. How you weigh these pros and cons of unbundled production applications depends on your specific application and use-case.

Of course, you're always free to add a bundler as a part of your production build pipeline only and you'll continue to get the developer experience boost. Or, just use  Snowpack to get started and then add a bundler whenever you feel you need to for performance. That's what we did when we started www.pika.dev, and years later performance is still good. 

To learn more about unbundled load performance, check out Max Jung's post on ["The Right Way to Bundle Your Assets for Faster Sites over HTTP/2"](https://medium.com/@asyncmax/the-right-way-to-bundle-your-assets-for-faster-sites-over-http-2-437c37efe3ff). It's the best study on HTTP/2 performance & bundling we could find online, backed up by real data. Snowpack's installation most closely matches the study's moderate, "50 file" bundling strategy. Jung's post found that for HTTP/2, "differences among concatenation levels below 1000 [small files] (50, 6 or 1) were negligible."

### Cache Performance

Snowpack performs best when it comes to caching. Snowpack keeps your dependencies separate from your application code and from each other, which gives you a super-optimized caching strategy *by default.* This lets the browser cache dependencies as efficiently as possible, and only fetch updates when individual dependencies are updated.

The same applies to unbundled application code as well. When you make changes to a file, the browser only needs to re-fetch that one file. This is especially useful if you manage multiple deployments a day, since only changed files need to be loaded.

