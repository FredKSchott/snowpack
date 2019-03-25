<p align="center">
  <img alt="Logo" src="https://next.pikapkg.com/static/img/pika-web-logo.png" width="280">
</p>

<p align="center">
   <strong>@pika/web</strong> • Run npm dependencies directly in the browser. No Browserify, Webpack or import maps required.
</p>

<p align="center">
  <a href="https://twitter.com/midudev/status/1101828172390248448">
    <img alt="Logo" src="https://next.pikapkg.com/static/img/pika-web-demo.png?f" width="540">
  </a>
</p>

---

[npm on Dec 6, 2018](https://medium.com/npm-inc/this-year-in-javascript-2018-in-review-and-npms-predictions-for-2019-3a3d7e5298ef) - *"JavaScript in 2018 is somewhat notorious for requiring a lot of tooling to get going, which is quite a reversal from the situation in 2014... **All of our survey respondents would like to see less tooling [and] less configuration required to get started**."*

---


## @pika/web brings that nostalgic, 2014 simplicity to 2019 web development:

- **Simple** 💪 No bundlers required. Load [modern packages](http://pikapkg.com) natively in the browser.
- **Flexible** 🧘‍♂️ Handles dependency trees of any size, even ones that includes legacy Common.js packages.
- **HTTP/2 Optimized** ⚡️ No more huge JS bundles. Browsers only download dependencies when they change.

@pika/web installs npm packages as single `.js` files to a new `web_modules/` directory. If your dependency exports an [ES "module" entrypoint](https://github.com/rollup/rollup/wiki/pkg.module) in its `package.json` manifest, it is supported. Even if it internally depends on other npm packages (even legacy Common.js packages) @pika/web should be able to handle it.

Bundling packages on a per-module basis like this makes it easy to build a web application that runs fast and caches well. Updating a single dependency won't force a complete re-download of your web application. [More on performance below.](#performance)

> ┻┳|  
> ┳┻| _  
> ┻┳| •.•) 💬 *"Tip: Use [pikapkg.com](https://www.pikapkg.com) to find modern, web-ready packages on npm :)"*  
> ┳┻|⊂ﾉ     
> ┻┳|  


## Quickstart

```
npm install --save-dev @pika/web
yarn add --dev @pika/web
```

```diff
# 1. Run @pika/web in your project:
$ npx @pika/web

# 2. Replace all NPM package imports in your web app with web-native URLs:
- import { createElement, Component } from "preact";
- import htm from "htm";
+ import { createElement, Component } from "/web_modules/preact.js";
+ import htm from "/web_modules/htm.js";

# 3. Run that file directly in the browser and see the magic!  
✨ ~(‾▿‾~)(~‾▿‾)~ ✨

# (Optional) If you already use Babel to build your application, skip "Step 2" and let our plugin rewrite your imports automatically:
echo '{"plugins": [["@pika/web/assets/babel-plugin.js"]]}' > .babelrc

# (Optional) Add a package.json "prepare" script to run @pika/web on every npm install:
{"scripts": {"prepare": "pika-web"}}
```

## Examples? We got 'em

- A basic, three-dependency @pika/web project: [[Source]](https://glitch.com/edit/#!/pika-web-example-simple) [[Live Demo]](https://pika-web-example-simple.glitch.me/)
- A Preact + HTM project: [[Source]](https://glitch.com/edit/#!/pika-web-example-preact-htm) [[Live Demo]](https://pika-web-example-preact-htm.glitch.me)
- Preact, HTM, Electron, Three.js... [See our full list of examples →](/EXAMPLES.md)


## Performance

When @pika/web installs your dependencies, it bundles each package into a single ESM JavaScript file. Shared chunks are created for any shared, existing transitive dependencies. Example: If @pika/web installs 10 npm packages into `web_modules/`, you can expect 10 JavaScript files and maybe a few additional shared chunks.

Max Jung's post on ["The Right Way to Bundle Your Assets for Faster Sites over HTTP/2"](https://medium.com/@asyncmax/the-right-way-to-bundle-your-assets-for-faster-sites-over-http-2-437c37efe3ff) is the best study on HTTP/2 performance & bundling we could find online. @pika/web's installation most closely matches the study's moderate, "50 file" bundling strategy. Jung's post found that for HTTP/2, "differences among concatenation levels below 1000 [small files] (50, 6 or 1) were negligible."

More testing is needed, but at this early stage we feel confident extrapolating the following: When served with HTTP/2, @pika/web installations perform better in production than single "vendor" JavaScript bundles and most custom dependency bundling strategies due to the comparable load performance and efficient cache usage.

## Browser Support

@pika/web installs ES Module (ESM) dependencies from npm, which run [wherever ESM syntax is supported](https://caniuse.com/#feat=es6-module). This includes all modern browsers (Firefox, Chrome, Edge, Safari) going back at least a year, but not IE11 or UC Browser for Android.


## Options

### package.json Options

> *Note: All package.json options are scoped under the `"@pika/web"` property.*

* `"webDependencies"`: You can define an optional whitelist of "webDependencies" in your `package.json` manifest. This is useful if your entire "dependencies" object is too large, or if you'd like to install dependencies by file path.

```js
  "dependencies": { "htm": "^1.0.0", "preact": "^8.0.0", /* ... */ },
  "@pika/web": {
    "webDependencies": [
      "htm",
      "preact",
      "preact/hooks", // A package within a package
      "unistore/full/preact.es.js" // An ESM file within a package
    ]
  },
```

#### Additional `package.json` Options

The [CLI options](#cli-options) below can also be added directly to the `@pika/web` object in `package.json` allowing you to set default values that can be overridden using the command line.

```json
{
  "@pika/web": {
    "dest": "htdocs"
  }
}
```


### CLI Options


* `--dest`: Specify destination directory (default: `web_modules/`).
* `--clean`: Clear out the destination directory before install.
* `--optimize`: Minify installed dependencies.
* `--strict`: Only install pure ESM dependency trees. Great for purists, or anyone who doesn't want to deal with transitive Common.js and Node.js-only dependencies.


## Why?

Pika's mission is to make modern JavaScript more accessible by making it easier to find, publish, install, and use modern packages on npm. You can learn more about the Pika project at https://www.pikapkg.com/about.


## Special Thanks: Rollup

@pika/web is powered internally by [Rollup](https://rollupjs.org/). We believe that bundlers shouldn't be a *requirement* for modern web development, but none of this would be possible without the awesome work done by Rollup contributors. If you use and enjoy our software, consider contributing back to [Rollup on Open Collective](https://opencollective.com/rollup).
