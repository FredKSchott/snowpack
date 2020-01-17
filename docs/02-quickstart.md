## Get Started

### Installing Snowpack

```toml
npm install --save-dev snowpack
   (or) yarn add --dev snowpack

# Then, run Snowpack:
npx snowpack
```

### Installing a Dev Server

Snowpack is agnostic to how you serve your site during development. If you have a static dev server that you already like, use it to serve your Snowpack app. Otherwise, we recommend one of the following for local development:

- [`serve`](https://www.npmjs.com/package/serve) (recommended: popular, easy to use)
- [`servor`](https://www.npmjs.com/package/servor) (recommended: has live-reload, built for SPAs)
- [`live-server`](https://www.npmjs.com/package/live-server), [`lite-server`](https://www.npmjs.com/package/lite-server), [`browser-sync`](https://www.npmjs.com/package/browser-sync), [`es-dev-server`](https://www.npmjs.com/package/es-dev-server) (honorable mentions)
- [`now dev`](http://now.sh/), [`netlify dev`](https://www.netlify.com/products/dev/) (if you already deploy via Zeit/Netlify)


### Quick Start

#### 0. First, create a new project directory

```
mkdir snowpack-demo
cd snowpack-demo
npm init --yes
```

#### 1. Install your dependencies

```
npm install --save preact htm
```

We'll start this tutorial by using Preact (similar to React) & HTM (similar to JSX). Even if you only want to use React and JSX, you should still start here. By the end of this tutorial, we'll show how you can optionally replace Preact with React, and HTM with JSX (via Babel).


#### 2. Run Snowpack to create your web_modules/ directory

```bash
npx snowpack
✔ snowpack installed: preact, htm. [0.50s]
```

If all went well, you should see a `web_modules/` directory containing the files `preact.js` & `htm.js`. This is the magic of Snowpack: you can import this file directly in the browser. This lets you ship your application to the browser without requiring a bundler.

Optionally, you can now run `npm install snowpack --save-dev` to speed up future Snowpack runs. Otherwise, npx tends to re-install the tool before every run.


#### 3. Create a simple HTML file for your application:

```html
<!-- File Location: index.html -->
<!DOCTYPE html>
<html lang="en">
  <head><title>Snowpack - Simple Example</title></head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/app.js"></script>
  </body>
</html>
```

#### 4. Create a simple JavaScript application:

```js
/* File Location: src/app.js */
// Import your web-ready dependencies
import { h, Component, render } from '/web_modules/preact.js';
import htm from '/web_modules/htm.js';
const html = htm.bind(h);
// Create your main app component
function SomePreactComponent(props) {
  return html`<h1 style="color: red">Hello, World!</h1>`;
}
// Inject your application into the an element with the id `app`.
render(html`<${SomePreactComponent} />`, document.getElementById('app'));
```

#### 5. Serve & run your application

```
npx servor --reload
```

Start up a simple dev server (we recommend [servor](https://github.com/lukejacksonn/servor) with the `--reload` flag for live-reload). Open your web browser and see your application running directly in the browser, instantly!

Any changes that you make to your src/app.js file are **immediately** reflected via either live-reload (if supported by your dev server) or a manual browser refresh. No bundlers, no build steps, and no waiting around for things to re-build after you make a change.

Open up your browser's Dev Tools and debug your application directly in the browser. Browse your source code, set breakpoints, and get more useful error messages.


#### 6. Optional Next Steps

- Replace Preact with React (see our [React](#react) guide below).
- Replace HTM with JSX (see our [Babel](#babel) guide below).
- Add TypeScript support (see our [TypeScript](#typescript) guide below).
- Add 'package name" import support (see our [Importing Packages by Name](#importing-packages-by-name)) guide below).
- See all of our guides below!




### Bootstrap a Starter App

🆕 Check out **[`snowpack-init`](https://github.com/pikapkg/snowpack-init)**! Instantly bootstrap a starter app with Snowpack. Choose between templates for Preact, Lit-HTML, TypeScript, and more.
