---
layout: layouts/post.njk
---

After 40+ beta versions & release candidates we are so excited to introduce **Snowpack 2.0**, featuring:

- A bundle-free web dev tool that starts up in 50ms or less.
- A file build process that stays fast as your codebase grows.
- [Bundled builds for production](/#snowpack-build) (powered by Webpack or Parcel)
- [Hot Module Replacement (HMR)](/#hot-module-replacement) for React, Preact, Vue, Svelte & more.
- Out-of-the-box support for TypeScript, JSX, CSS Modules & more.
- [Custom build scripts](/#build-scripts) & [third-party plugins](/#build-plugins) to connect your favorite tools.


<br/>

## Snowpack 2.0: Rethinking Best Practices

!["Rethink established best practices" tweet.](/img/react-snarky-tweet-2.png)

"Rethink established best practices." That was the famous antagonistic tweet directed at the React team back when React & JSX were first announced in 2013.

The Tweet was meant as a criticism of the project, but the React team turned it into a rallying cry. Pete Hunt even named [an entire JSConf talk](https://www.youtube.com/watch?v=DgVS-zXgMTk) after it, explaining why "rethinking best practices" was exactly what the web needed at that moment. 7 years later, Pete was proven right.

**Snowpack set out to challenge best practices again, this time around web tooling.** The web has evolved over the last decade, but our build tooling hasn't kept up. The assumptions and limitations of the previous decade no longer fit the requirements of today.

**Snowpack proves that web developers don't NEED a bundler to build complex web applications.** The idea that a bundler is *required* for any meaningful web development only goes back the last decade (with the rise of Browserify and later, Webpack). Snowpack is a return to the norm, where bundling is an optional production optimization available to those who want it

<blockquote class="twitter-tweet" data-conversation="none" data-dnt="true"><p lang="en" dir="ltr">Check out the network tab to see unbundled development in action:<br><br>1️⃣ App.js is changed<br>2️⃣ App.js is refetched via HMR<br>3️⃣ App.js is rebuilt from source<br>✅ Total time: a few milliseconds. <br><br>Zero bundling, rebundling, or multi-file compiling needed for the snappiest update possible</p>&mdash; Pika 📦 (@pikapkg) <a href="https://twitter.com/pikapkg/status/1264245654970232832?ref_src=twsrc%5Etfw">May 23, 2020</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

**Bundling during development slows you down.**  It may be hard to see, since most of us haven't done meaningful web development *without* a bundler in ages. But under the hood, bundled dev servers like `webpack-dev-server` & Create React App need to load, build, resolve and bundle your application before you can serve a single file. Smart caching can speed this up somewhat, but it's still common for a dev servers to take 30+ seconds to startup. And that's not even counting the time you spend re-bundling your application after you make a change, which can take another several seconds before you see those changes reflected in the browser.

**You can think of bundling as a step with `O(n)` complexity:** As the size of your project grows, your bundler needs to do more work to startup your app. Depending on how your bundler is designed, it may even have `O(n^2)` complexity: as your project grows, your dev environment gets ***exponentially*** slower as it handles code splitting and every possible bundle permutation. Neither scenario is ideal when you're working iwth hundreds or even thousands of files. 

## The Future: O(1) Build Tooling

![webpack vs. snowpack diagram](/img/snowpack-unbundled-example-3.png)

Snowpack introduces a new, lighter workflow for web development that helps developers iterate faster with less tooling complexity.

**Snowpack is a platform for O(1) build tooling.**  This is a term first coined by CodeSandbox's [Ives van Hoorne](https://www.youtube.com/watch?v=Yu9zcJJ4Uz0). His quote perfectly encapsulates our goals with Snowpack's workflow: when a file changes, it gets sent through a deterministic `input -> build -> output` workflow.

- O(1) build tooling is easier to reason about.
- O(1) build tooling stays fast in large projects.
- Caching files individually is more efficient.
- There's no multi-file rebuilding/rebundling to worry about.

Pair this with a platform like Snowpack that builds individual files as requested by the browser, and you get a developer experience that's dramatically lighter-weight than your traditional, bundled dev server.


## `dev` - A Better Dev Environment

![dev command output example](/img/snowpack-dev-startup-2.png)

Run `snowpack dev` to start your dev environment, and the first thing you'll notice is **how flippin' fast it is.** Snowpack starts up instantly, usually in less than 20ms. 

That's right, 20ms. 

This speed is possible since Snowpack only builds files upon request. On your first page load, Snowpack builds each requested file and then caches it for future use. Files are cached individually and only re-built when changed.

`snowpack dev` includes a dev server for hosting, a fully customizable build pipeline for building, and a bunch more familiar features right out of the box:

- TypeScript Support
- JSX Support
- Hot Module Replacement (HMR)
- Importing CSS & CSS Modules
- Importing Images & Other Assets
- Custom Routing
- Proxying Requests

**Build Scripts** are 1-line integrations to connect your favorite build tools into your Snowpack build. O(1)build tooling allow every file build to be expressed as a linear `input -> build -> output` workflow. This flow lets Snowpack pipe your files into and out of any existing UNIX-y CLI tools.


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

If you've ever used your `package.json` "scripts" config, this format should feel familiar. We love how `package.json` scripts use your CLIs directly without an unnecessary plugin system. We hope this pattern offers a similar intuitive path.

**Build Plugins** are even more powerful JavaScript integrations for when no CLI exists or you just want to write your own integration. Build plugins gives you a clean JavaScript interface to extend your build.


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

Outside of development, there are still good reasons to bundle your web application.    File minification, compression, and network optimizations can all make your site run faster for your users.

Run `snowpack build` to build your site for production. By default, Snowpack's build isn't bundled, but a single plugin can integrate Webpack, Parcel, or the bundler of your choice as the final step in your build.

```js
// snowpack.config.json
{
  // Optimize your production builds with Webpack
  "plugins": [["@snowpack/plugin-webpack", {/* ... */}]]
}
```


## Try Snowpack Today

Download Snowpack today to experience what we believe to be the future of web development.

```
npm i snowpack@latest --save-dev
```

If you already have an existing Snowpack application, Snowpack 2.0 will walk you through updating any outdated configuration. Snowpack's original package installer still works as expected, and with the new `dev` & `build` commands Snowpack even manages your web packages for you.


#### Create Snowpack App

The easiest way to get started with Snowpack is with [Create Snowpack App (CSA)](https://github.com/pikapkg/create-snowpack-app). CSA automatically initializes a starter application for you with a pre-configured, Snowpack-powered dev environment. 

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

