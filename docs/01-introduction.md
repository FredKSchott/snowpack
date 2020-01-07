## What is Snowpack?

### tl;dr

- **Build web applications with less tooling and 10x faster iteration.**
- Snowpack replaces Webpack, Parcel, Rollup and other JavaScript bundlers.
- Snowpack doesn't touch your source code. It runs once at install-time and only on your dependencies.
- Write your application, import your Snowpack-installed dependencies, and then run the whole application directly in browser.
- Supports Babel, TypeScript, and all other build tools (/w near-instant iteration speeds). 
- Production ready: Snowpack optimizes your dependencies with tree-shaking, minification, source maps, and more.

### Why?

- Ever been stuck waiting for your webapp to rebuild during development? Ever heard your laptop fans go wild every time you hit save? Then you've seen the cost of bundling on web development. 
- Bundlers like Webpack are powerful, but they can easily introduce a complex mess of configuration, plugins, and dependencies. Create React App, for example, installs ~200MB of dependencies and uses ~600 lines of Webpack configuration.
- Bundlers became a required web development tool in the 2010's, mainly because of npm's use of a module format that didn't run natively in the browser (Common.js). 
- Bundling had been around forever, but up until that point it had been a production-only optimization and not a dev-time requirement.
- Now that we have native modules in most browsers (ESM) bundlers are no longer required. You can build a performant, production-ready web application without Webpack!
- **By replacing a rebuild-on-every-change build step (Webpack) with a run-once install step (Snowpack) you get a 10x faster dev environment with less tooling complexity.**


### Who Should Use Snowpack?

- **Beginners!** Popular starter applications usually come with 1000's of dependencies and 100's of lines of bundler configuration that you don't actually need. Snowpack shrinks the number of things you need to learn to get started with web development. Shipping your code directly to the browser also lets you easily inspect your code in the browser, set break-points, etc. for faster feedback loops.
- **Anyone starting a new application!** Snowpack has zero lock-in, so you can always add a traditional bundler later down the road. But until then, you get all the dev speed improvements that come with bundler-free development. 
- **Anyone who wants a lightning-fast dev environment!** Less tooling means less to install, less to do every time you make a change, and less to debug when something goes wrong. Shipping your code to the browser also makes your Dev Tools much more useful for debugging.

### Who Should Avoid Snowpack?

- **Anyone building for the enterprise!** IE 11 still doesn't support ESM, which is required for Snowpack-installed dependencies to run.
- **Anyone building for China (Today)!** UC Browser doesn't support ESM, although it should soon.
- **Anyone who loves tooling-heavy development!** This isn't sarcastic, I promise! By dropping the bundler, you can't do the magic that Webpack is famous for. Using `import` to load CSS, Images, and other non-JS resources is  non-standard and unsupported in the browser (for now). You may appreciate a dev environment that is true to what standard JavaScript browsers support. Or, you may find this annoying.

### How Does Snowpack Work?

```js
import React from '/web_modules/react.js';
```

1. Snowpack installs your dependencies into a new `web_modules/` directory. 
2. Each dependency is installed as a single ESM JavaScript file. For example, React (and all of its files & dependencies) are installed to `web_modules/react.js`. 
3. Browsers can `import` these ESM files directly without a bundler or any tooling needed.


### Browser Support

Snowpack installs ES Module (ESM) dependencies from npm, which run [wherever ESM syntax is supported](https://caniuse.com/#feat=es6-module). This includes ~90% of all browsers in use today. **All modern browsers (Firefox, Chrome, Edge, Safari) going back to 2018 support it.**

The only two notable browsers that don't support ESM are IE11 and UC Browser for Android. If your need to support users in the enterprise or China, you should consider sticking with traditional web application bundlers.

Additionally, Snowpack runs all dependencies through Babel via `@preset/env` to transpile any less-suported language features found in your dependencies. You can customize this behavior by setting your own "browserslist" key in your `package.json` manifest (see below).


### Performance

You can think of Snowpack like code-splitting for Webpack or Rollup. Dependencies are installed as single files, with all internal package files bundled together as efficiently as possible. Any common, shared dependencies are moved into common, shared chunks in your `web_modules/` directory.

Max Jung's post on ["The Right Way to Bundle Your Assets for Faster Sites over HTTP/2"](https://medium.com/@asyncmax/the-right-way-to-bundle-your-assets-for-faster-sites-over-http-2-437c37efe3ff) is the best study on HTTP/2 performance & bundling we could find online. Snowpack's installation most closely matches the study's moderate, "50 file" bundling strategy. Jung's post found that for HTTP/2, "differences among concatenation levels below 1000 [small files] (50, 6 or 1) were negligible."

Snowpack performs best when it comes to caching. Snowpack keeps your dependencies separate from your application code and from each other, which gives you a super-optimized caching strategy *by default.* This lets the browser cache dependencies as efficiently as possible, and only fetch updates when individual dependencies are updated.

The same applies to unbundled application code as well. When you make changes to a file, the browser only needs to re-fetch that one file. This is especially useful if you manage multiple deployments a day. 


## Installation

``` bash
# Try Snowpack before installing:
npx snowpack      
# Installing Snowpack locally speeds up npx: 
npm install --dev snowpack
```


## Quickstart

🆕 Check out **[`npx @pika/init`](https://github.com/pikapkg/init)**! Bootstrap a starter app with Snowpack, Preact, TypeScript, and more.

#### 1. Create a new project directory

```
mkdir snowpack-demo
cd snowpack-demo
npm init --yes
npm install --save preact@10
```

We're using Preact for this Quickstart, but you could use any package. If you're just starting out, we strongly recommend packages with an ESM "module" entrypoint defined, which can be found on pika.dev. Legacy packages (Common.js) are supported, but are more likely to cause issues at install-time.


#### 2. Run Snowpack to create your web_modules directory

```bash
npx snowpack
# Optional: Run "npm install snowpack --dev" to speed up future runs
```


#### 3. Create a simple HTML file for your application:

```html
<!-- File Location: index.html -->
<!DOCTYPE html>
<html lang="en">
  <head><title>Snowpack - Simple Example</title></head>  
  <body>
    <div id="app"></div>
    <script type="module" src="/src/app.js">
  </body>
</html>
```

#### 4. Create a simple JavaScript application:

```js
/* File Location: src/app.js */
// Import your web-ready dependencies
import { h, Component, render } from '/web_modules/preact.js';
// Create your app
const app = h('div', null, 'Hello World!');
// Inject your application into the an element with the id `app`.
render(app, document.getElementById('app'));
```

#### 5. Serve your application to view it in a web browser!

```
npx serve
# Optional: Run "npm install -g serve" to speed up future runs
```

Look at that! No bundler needed! Any changes that you make to your src/app.js file are **immediately** reflected when you refresh your page. No bundlers, build steps, or waiting around required.

#### 6. Next Steps

- Open up your browser's Dev Tools, and browse your source code directly in the browser!
- Add HTM to your project as a tooling-free alternative to JSX.

```js
/* File Location: src/app.js */
import { h, Component, render } from '/web_modules/preact.js';
import htm from '/web_modules/htm.js';
const html = htm.bind(h);
// Create your app with HTM.
const app = html`<div>Hello World!</div>`
// Render your app.
render(app, document.getElementById('app'));
```

- Add Babel to your project so that you can use JSX. 

```bash
babel src/ --out-dir lib --watch
```

```jsx
/* File Location: src/app.js */
/* Babel Output:  lib/app.js (Remember to point your index.html file here!) */
import { h, Component, render } from '/web_modules/preact.js';
// Create your app with HTM.
const app = (<div>Hello World!</div>);
// Render your app.
render(app, document.getElementById('app'));
```

- Add TypeScript to your project.
- Check out our guides below for more inspiration!
