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

- [`serve`](https://www.npmjs.com/package/serve) (popular, easy to use)
- [`servor`](https://www.npmjs.com/package/servor) (dependency free, has live-reload by default)
- [`live-server`](https://www.npmjs.com/package/live-server) (popular, easy to use, has live-reload)
- [`lite-server`](https://www.npmjs.com/package/lite-server) (has live-reload, built for SPAs)
- [`browser-sync`](https://www.npmjs.com/package/browser-sync) (popular, battle-tested)
- `now dev`/`netlify dev` (If you already deploy via Zeit/Netlify)


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
npx serve
# Optional: Run "npm install -g serve" to speed up future runs
```

Open a web browser and see your application running directly in the browser, as written! Any changes that you make to your src/app.js file are **immediately** reflected when you refresh your page. No bundlers, build steps, or waiting around required.

Open up your browser's Dev Tools and debug your application directly in the browser. Browse your source code as its written. Set breakpoints. Get more useful error messages.

#### 6. Optional Next Steps

- Replace Preact with React (see our [React](#react) guide below).
- Replace HTM with JSX (see our [Babel](#babel) guide below).
- Add TypeScript support (see our [TypeScript](#typescript) guide below).
- Add 'package name" import support (see our [Importing Packages by Name](#importing-packages-by-name)) guide below).
- See all of our guides below!




### Bootstrap a Starter App

🆕 Check out **[`snowpack-init`](https://github.com/pikapkg/snowpack-init)**! Instantly bootstrap a starter app with Snowpack. Choose between templates for Preact, Lit-HTML, TypeScript, and more.
