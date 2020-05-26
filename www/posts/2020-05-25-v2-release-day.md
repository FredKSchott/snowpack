---
layout: layouts/post.njk
---

After 40+ beta versions & release candidates we are so excited to introduce **Snowpack 2.0**, featuring:

- A bundle-free dev environment that starts up in 50ms or less.
- Application build tooling that stays fast as your codebase grows.
- [Bundled production-optimized builds](/#snowpack-build) (powered by Webpack or Parcel)
- [Hot Module Replacement (HMR)](/#hot-module-replacement) for React, Preact, Vue, Svelte & more.
- Out-of-the-box support for TypeScript, JSX, CSS Modules & more.
- [Custom build scripts](/#build-scripts) & [third-party plugins](/#build-plugins) to connect your favorite tools.

For most Snowpack v1.x applications, all you need to do is run the following command and Snowpack 2.0 will walk you through updating any outdated configuration:

```
npm i snowpack@latest --save-dev
```


<br/>

## Snowpack 2.0: Rethinking Best Practices

!["Rethink established best practices" tweet.](/img/react-snarky-tweet-2.png)

"Rethink established best practices." That was the famous antagonistic tweet directed at the React team back when React & JSX were first announced in 2013.

It had been meant as a snarky burn against the project, but the React team turned it into a rallying cry. Pete Hunt even named [an entire JSConf talk](https://www.youtube.com/watch?v=DgVS-zXgMTk) after it, explaining why "rethinking best practices" was exactly what the web needed at that moment. 7 years later, and Pete was clearly proven right.

**Snowpack is a chance to rethink best practices again, this time around web tooling.** The web has evolved over the last decade, but our build tooling hasn't kept up. The best practices of the previous decade no longer fit the requirements of today.

**Snowpack is rethinking the biggest outdated assumption of all: the idea that web developers NEED bundlers.** Bundling continues to be great production optimization, dating all the way back to the early days of the web. It should continue to be available to those who want it. But... it was only in the last decade (with the rise of Browserify and later, Webpack) that bundling became a *required* part of your development workflow. 

<blockquote class="twitter-tweet" data-conversation="none" data-dnt="true"><p lang="en" dir="ltr">Check out the network tab to see unbundled development in action:<br><br>1️⃣ App.js is changed<br>2️⃣ App.js is refetched via HMR<br>3️⃣ App.js is rebuilt from source<br>✅ Total time: a few milliseconds. <br><br>Zero bundling, rebundling, or multi-file compiling needed for the snappiest update possible</p>&mdash; Pika 📦 (@pikapkg) <a href="https://twitter.com/pikapkg/status/1264245654970232832?ref_src=twsrc%5Etfw">May 23, 2020</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

**Bundling during development slows you down.**  It may be hard to see, since most of us haven't done meaningful web development *without* a bundler in ages. But under the hood, bundled dev servers like `webpack-dev-server` & Create React App need to load, build, resolve and bundle your application before you can serve a single file. Smart caching can speed this up somewhat, but it's still common for a dev servers to take 30+ seconds to startup. And that's not even counting the time you spend re-bundling your application after you make a change, which can take another several seconds before you see those changes reflected in the browser.

**You can think of bundling as a step with `O(n)` complexity:** As the size of your project grows, your bundler needs to do more work to startup your app. Depending on how your bundler is designed, it may even have `O(n^2)` complexity: as your project grows, your dev environment gets ***exponentially*** slower as it handles code splitting and every possible bundle permutation. Neither scenario is ideal when projects can grow to hundreds or even thousands of files. 

## The Future: O(1) Build Tooling

![webpack vs. snowpack diagram](/img/snowpack-unbundled-example-3.png)

Snowpack is a move away from complex bundled dev environments and towards faster, unbundled development. Unbundled development introduces a new, lighter complexity story for web development where you can move faster by simply doing less unnecessary work.

**Snowpack is a platform for O(1) build tooling.**  This is a term I first heard used by CodeSandbox's [Ives van Hoorne](https://www.youtube.com/watch?v=Yu9zcJJ4Uz0) that I think perfectly captures what makes Snowpack's workflow so great: when a file changes, only that file is rebuilt. There's no larger rebundling or application rebuilding needed, just a simple, linear, deterministic `input -> build -> output` workflow.

- O(1) build tooling is easier to reason about, since your build input is always a single file.
- O(1) build tooling stays fast in large projects because only changed files are ever rebuilt.
- Caching is much more effective as well, since file changes never invalidate other cached files.

Pair this with a platform like Snowpack that only builds individual files as requested by the browser, and you get a developer experience that's dramatically lighter-weight than your traditional, bundled dev server.


## `dev` - A Better Dev Environment

![dev command output example](/img/snowpack-dev-startup-2.png)

Run `snowpack dev` to start your dev environment, and the first thing you'll notice is **how flippin' fast it is.** Snowpack starts up instantly, usually in less than 20ms. 

That's right, 20ms. 

This incredible speed is possible because Snowpack only builds files during development as they are requested by the browser. On your very first page load, Snowpack will build each requested file and then cache it for future use. Because each file is built individually, that cached file can be reused forever without ever needing a second build (until you change the file yourself, that is).

`snowpack dev` includes a dev server for hosting, a fully customizable build pipeline for building, and a bunch more familiar features right out of the box:

- TypeScript Support
- JSX Support
- Hot Module Replacement (HMR)
- Importing CSS
- Importing CSS Modules
- Importing Images & Other Assets
- Custom Routing
- Proxying Requests

**Build Scripts** are 1-line integrations to connect your favorite build tools into your Snowpack build. Thanks to this new idea of O(1) build tooling, every file build can be expressed as a deterministic `input -> build -> output` workflow, which makes Snowpack perfect for Linux-style piping through an already-existing CLI. 


```js
// snowpack.config.json
{
  "scripts": {
    // Pipe every "*.css" file through the PostCSS CLI
    // stdin (source file) > postcss > stdout (build output)
    "build:css": "postcss",
  }
}
```

If you've ever used your `package.json` "scripts" config, Snowpack's build scripts should feel familiar by design. We love how `package.json` scripts are able to use your tooling CLIs directly without forcing you to adopt an unnecessary plugin system, and we tried to recreate that magic feeling here.

**Build Plugins** are even more powerful JavaScript integrations for when a CLI just won't cut it. Maybe your favorite build tool doesn't ship a CLI, or that tool's CLI is too slow, or you just want to write your own integration. Build plugins gives you a clean JavaScript interface to extend your build with.


```js
// snowpack.config.json
{
  // Connect Babel to your build to run every JS/JSX/TS/TSX file through it
  "plugins": ["@snowpack/plugin-babel"]
}
```

[Check out our full collection of official Snowpack plugins](https://github.com/pikapkg/create-snowpack-app/tree/master/packages), and consider writing your own.


## `build` - Optimized, Bundled Builds

![build output example](/img/snowpack-build-example.png)

Run `snowpack build` to build your site for production. This command runs your entire application through your build, outputting a static `build/` directory as a result.

This is where you can now decide to bring in a bundler, if you like. Bundling can result in better compression & networking performance in production, in addition to the minification and optimization steps that Snowpack normally would skip during development. By default, Snowpack's build isn't bundled, but with a single plugin you can integrate Webpack, Parcel, or the bundler of your choice as the final step in your build.

```js
// snowpack.config.json
{
  // Optimize your production builds with Webpack
  "plugins": [["@snowpack/plugin-webpack", {/* ... */}]]
}
```

Snowpack still recommends that production applications use bundling, which means that your final build should **look exactly the same as it probably does today.** Snowpack is a new, faster take on build tooling, but the end result is still the same: fast, bundled applications.


## Try Snowpack Today

Download Snowpack today to experience what we believe to be the future of web development.

```
npm i snowpack@latest --save-dev
```

#### Create Snowpack App

The easiest way to get started with Snowpack is with [Create Snowpack App (CSA)](https://github.com/pikapkg/create-snowpack-app). CSA automatically initializes a starter application for you with an already-configured, Snowpack-powered dev environment. 

``` bash
npx create-snowpack-app new-dir --template [SELECT FROM BELOW] [--use-yarn]
```


- [@snowpack/app-template-blank](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-blank)
- [@snowpack/app-template-react](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-react)
- [@snowpack/app-template-react-typescript](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-react-typescript)
- [@snowpack/app-template-preact](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-preact)
- [@snowpack/app-template-svelte](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-svelte)
- [@snowpack/app-template-vue](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-vue)
- [@snowpack/app-template-lit-element](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-lit-element)
- [@snowpack/app-template-11ty](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-11ty)
- **[See all community templates](https://github.com/pikapkg/create-snowpack-app)**

