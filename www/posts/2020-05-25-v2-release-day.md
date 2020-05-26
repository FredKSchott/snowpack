---
layout: layouts/post.njk
---

After 40+ beta versions & release candidates we are excited to introduce **Snowpack 2.0**, featuring:

- A web app dev environment that starts up in **50ms or less.**
- File changes are reflected in the browser [instantly.](/#hot-module-replacement) 
- Integrates with your favorite bundler for [production builds](/#snowpack-build).
- Out-of-the-box support for [TypeScript, JSX, CSS Modules and more.](/#features)
- [Custom build scripts](/#build-scripts) & [third-party plugins](/#build-plugins) to connect your favorite tools.

<br/>

## Snowpack 2.0: Rethinking Best Practices

!["Rethink established best practices" tweet.](/img/react-snarky-tweet-2.png)

"Rethink established best practices" was a famous, antagonistic tweet directed at the React team back when React & JSX were first announced in 2013. It was meant as criticism, but the React team turned it into a rallying cry. Pete Hunt even named [an entire JSConf talk](https://www.youtube.com/watch?v=DgVS-zXgMTk) after it, explaining why "rethinking best practices" was exactly what the web needed. 7 years later, Pete was proven right.

**Snowpack is another attempt to challenge best practices, this time around web tooling.** The web has evolved over the last decade, but our build tooling hasn't kept up. The assumptions and limitations of the previous decade no longer fit the world we live in today. The result is a tooling ecosystem that's slower and more complex than it needs to be.

**Snowpack takes a new approach to web development.** Instead of always running your application through a bundler, Snowpack lets you develop your application without one, shipping your code directly to the browser instead.

<blockquote class="twitter-tweet" data-conversation="none" data-dnt="true"><p lang="en" dir="ltr">Check out the network tab to see unbundled development in action:<br><br>1️⃣ App.js is changed<br>2️⃣ App.js is refetched via HMR<br>3️⃣ App.js is rebuilt from source<br>✅ Total time: a few milliseconds. <br><br>Zero bundling, rebundling, or multi-file compiling needed for the snappiest update possible</p>&mdash; Pika 📦 (@pikapkg) <a href="https://twitter.com/pikapkg/status/1264245654970232832?ref_src=twsrc%5Etfw">May 23, 2020</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

**Bundling during development slows you down.**  It may be hard to see, since most of us haven't done meaningful web development *without* a bundler in ages. But under the hood, bundled dev servers like `webpack-dev-server` & Create React App need to load, build, resolve and bundle your application before serving a single file. Smart caching can speed this up somewhat, but it's still common for a dev servers to take 30+ seconds to startup. And that's not even counting the time you spend re-bundling your application after you make a change, which can take another several seconds before you see those changes reflected in the browser.

**You can think of bundling as a step with `O(n)` complexity:** As the size of your project grows, your bundler needs to do more work to startup your app. Depending on how your bundler is designed, it may even have `O(n^2)` complexity: as your project grows, your dev environment gets ***exponentially*** slower as it handles code splitting and every possible bundle permutation. Neither scenario is ideal when you're working iwth hundreds or even thousands of files. 

## The Future: O(1) Build Tooling

![webpack vs. snowpack diagram](/img/snowpack-unbundled-example-3.png)

Snowpack introduces a new, lighter workflow for web development that helps developers iterate faster with less tooling complexity.

**Snowpack is a platform for O(1) build tooling.**  This term was first coined by CodeSandbox's [Ives van Hoorne](https://www.youtube.com/watch?v=Yu9zcJJ4Uz0). His quote perfectly encapsulates our vision: when a file changes, it gets sent through a deterministic `input -> build -> output` workflow. This has several advantages over the traditional bundled approach:

- O(1) builds are predictable.
- O(1) builds are easier to configure.
- O(1) builds stay fast in large projects.
- Caching individual file builds is more efficient.
- There's no multi-file rebuilding/rebundling to worry about.

Pair this with a platform like Snowpack that only builds files as they are requested by the browser, and you get a lightweight developer experience that will never cause your laptop fans to spin.


## A Better Dev Environment

![dev command output example](/img/snowpack-dev-startup-2.png)

Run `snowpack dev` to start your dev environment and the first thing you'll notice is **how flippin' fast it is.** Snowpack starts up instantly, usually in less than 50ms. That's no typo: 50 milliseconds or less.

Snowpack's dev server is fast because it only builds files upon request. On your first page load, Snowpack builds each requested file and then caches it for future use. Files are cached individually and only re-built when changed.

`snowpack dev` includes a dev server for hosting, a fully customizable build pipeline for building, and a bunch of familiar features right out of the box:

- TypeScript Support
- JSX Support
- Hot Module Replacement (HMR)
- Importing CSS & CSS Modules
- Importing Images & Other Assets
- Custom Routing
- Proxying Requests


## Customizing Your Build

[Build Scripts](/#build-scripts) let you connect your favorite existing tools into your build pipeline. With Snowpack, you express every build as a linear `input -> build -> output` workflow. This allow Snowpack to pipe your files into and out of any existing UNIX-y CLI tools without the need for a special plugin ecosystem.


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

If you've ever used your `package.json` "scripts" config, this format should feel familiar. We love the simplicity of using your CLIs directly without an unnecessary plugin system. We hope this pattern offers a similar intuitive design.

[Check out docs](/#build-scripts) to learn more about customizing your build.


## Bundling for Production

![build output example](/img/snowpack-build-example.png)

Snowpack isn't against bundling for production. In fact, we recommend it. File minification, compression, and network optimizations can all make a bundled site run faster for your users, which should be the ultimate goal for any application. 

Snowpack maintains official plugins for both Webpack & Parcel. Connect your favorite, and then run `snowpack build` to build your site for production. 

```js
// snowpack.config.json
{
  // Optimize your production builds with Webpack
  "plugins": [["@snowpack/plugin-webpack", {/* ... */}]]
}
```

If you don't want to connect a bundler, that's okay too. Snowpack's default build will give you an unbundled site that also runs just fine. This is what the Snowpack project has been all about from the start: **Use a bundler because you want to, and not because you need to.**


## Try Snowpack Today

Download Snowpack today to experience the future of web development.

```
npm i snowpack@latest --save-dev
```

If you already have an existing Snowpack application, Snowpack 2.0 will walk you through updating any outdated configuration. Snowpack's original package installer still works as expected, and with the new `dev` & `build` commands Snowpack even manages your web packages for you.

**[Check out our docs site to learn more.](https://www.snowpack.dev/)**

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

