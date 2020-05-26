---
layout: layouts/post.njk
---

After 40+ beta versions & release candidates we are excited to introduce **Snowpack 2.0**, featuring:

- A dev environment that starts up in **50ms or less.**
- File changes reflected in the browser [instantly.](/#hot-module-replacement) 
- Out-of-the-box support for [TypeScript, JSX, CSS Modules and more.](/#features)
- [Custom build scripts](/#build-scripts) & [third-party plugins](/#build-plugins) to connect your favorite tools.
- [Create Snowpack App (CSA)](/#create-snowpack-app-(csa)) starter templates.

<br/>

## Snowpack 2.0: Rethinking Best Practices

The web has evolved over the last decade, but our build tools haven't kept up. The assumptions and limitations of the previous decade no longer apply to the world we live in today. **Most build tools are slowing you down unnecessarily.** 

I'm talking about bundlers. Or, more specifically, the practice of bundling during development. Under the hood, bundlers like Webpack, Parcel and Next.js need to load, resolve, build and bundle your application before they can serve a single file. Smart caching speeds this up somewhat, but it's still common for a dev server to take 30  seconds or more to startup. And that's not even counting the time you spend re-bundling your application after you make a change, which can take another couple of seconds *per change*.

**Snowpack is a new approach to web development.** Instead of running your application through a bundler during development, Snowpack serves your built files directly. Thanks to [ES Module (ESM)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) support in the browser, Snowpack lets you skip [the unnecessary bundling work](https://twitter.com/pikapkg/status/1264245654970232832?ref_src=twsrc%5Etfw) during development.



## The Future: O(1) Build Tools

![webpack vs. snowpack diagram](/img/snowpack-unbundled-example-3.png)


**Traditional web bundling is a step of `O(n)` complexity.** That means that as your project grows, your dev environment takes longer to startup and react to changes. Some bundlers may even have `O(n^2)` complexity: as your project grows, your dev environment gets ***exponentially*** slower as it handles code splitting, tree-shaking, and other bundle permutations. Neither scenario is ideal when you're working with hundreds or even thousands of files. 

**Snowpack is a platform for O(1) build tooling.**  This term was first coined by CodeSandbox's [Ives van Hoorne](https://www.youtube.com/watch?v=Yu9zcJJ4Uz0). It perfectly encapsulates our vision: Every file goes through a linear `input -> build -> output` build pipeline and then out to the browser. 

This has several advantages over the traditional bundled approach:

- It's less work.
- O(1) builds are predictable.
- O(1) builds are easy to reason about & configure.
- O(1) builds stay fast in large projects.
- Individual files cache better.


## A Faster Dev Environment

![dev command output example](/img/snowpack-dev-startup-2.png)

Run `snowpack dev` to start your dev environment and the first thing you'll notice is **how flippin' fast it is.** Snowpack starts up instantly, usually in less than 50ms. That's no typo: 50 milliseconds or less.

Snowpack's dev server is fast because it only builds files upon request. On your first page load, Snowpack builds each requested file and then caches it for future use. Files are cached individually and only re-built when changed. But with no work needed at initial start, your server spins up immediately.

`snowpack dev` includes a development server, a fully customizable build pipeline for building, and a bunch of familiar features right out of the box:

- TypeScript Support
- JSX Support
- Hot Module Replacement (HMR)
- Importing CSS & CSS Modules
- Importing Images & Other Assets
- Custom Routing
- Proxying Requests


## Customizing Your Build

[Build Scripts](/#build-scripts) let you connect your favorite build tools. With Snowpack, you express every build as a linear `input -> build -> output` workflow. This allow Snowpack to pipe your files into and out of any existing UNIX-y CLI tools without the need for a special plugin ecosystem.


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

To be clear, Snowpack isn't against bundling for production. In fact, we recommend it. File minification, compression, dead-code elimination and network optimizations can all make a bundled site run faster for your users, which should be the ultimate goal of any application. 

Snowpack maintains official plugins for both Webpack & Parcel. Connect your favorite, and then run `snowpack build` to build your site for production. 

```js
// snowpack.config.json
{
  // Optimize your production builds with Webpack
  "plugins": [["@snowpack/plugin-webpack", {/* ... */}]]
}
```

If you don't want to use a bundler, that's okay too. Snowpack's default build will give you an unbundled site that also runs just fine. This is what the Snowpack project has been all about from the start: **Use a bundler because you want to, and not because you need to.**


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


👋 Happy hacking!

---

*Thanks to [Melissa McEwen](https://twitter.com/melissamcewen) & [@TheoOnTwitch](https://twitter.com/TheoOnTwitch) for helping to edit this post.*