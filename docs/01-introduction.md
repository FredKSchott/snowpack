## What is Snowpack?

### tl;dr

- **Install any npm package to run directly in the browser via ESM.**
- Replaces traditional app bundlers (Webpack, Rollup, Parcel, etc). 
- Just run once at install time. No other tooling required.
- Enables tooling-free / build-free / bundle-free development.
- Works well with Import Maps.


### How Does it Work?

```js
import React from '/web_modules/react.js';
```

- Snowpack installs your `node_modules/` dependencies into a new `web_modules/` directory. 
- Each dependency is installed as a single ESM JavaScript file.
- This lets you import any `web_modules/` dependency file natively in the browser with no additional bundlers or tooling required.


### Browser Support

Snowpack installs ES Module (ESM) dependencies from npm, which run [wherever ESM syntax is supported](https://caniuse.com/#feat=es6-module). This includes ~90%+ of all browsers in use today. **All modern browsers (Firefox, Chrome, Edge, Safari) going back to 2018 support it.**

The only two notable browsers that don't support ESM are IE11 and UC Browser for Android. If your need to support users in the enterprise or China, you should consider sticking with traditional web application bundlers.

Additionally, Snowpack runs all dependencies through Babel via `@preset/env` to transpile any less-suported language features found in your dependencies. You can customize this behavior by setting your own "browserslist" key in your `package.json` manifest (see below).


### Performance

You can think of Snowpack like code-splitting with Webpack or Rollup. Dependencies are installed as single files, with all internal package files bundled together as efficiently as possible. 

Max Jung's post on ["The Right Way to Bundle Your Assets for Faster Sites over HTTP/2"](https://medium.com/@asyncmax/the-right-way-to-bundle-your-assets-for-faster-sites-over-http-2-437c37efe3ff) is the best study on HTTP/2 performance & bundling we could find online. Snowpack's installation most closely matches the study's moderate, "50 file" bundling strategy. Jung's post found that for HTTP/2, "differences among concatenation levels below 1000 [small files] (50, 6 or 1) were negligible."

Snowpack is most performant when it comes to caching. Snowpack keeps your dependencies separate from your application code, and from each other. This allows the browser cache dependencies as efficiently as possible, and only fetch updates when individual dependencies change.


## Installation

``` bash
# Try Snowpack before installing:
npx snowpack      
# Installing Snowpack locally speeds up npx: 
npm install --dev snowpack
```


## Quickstart

🆕 Check out **[`npx create-pika-app`](https://github.com/ndom91/create-pika-app)** Bootstrap a starter app with Snowpack, Preact, TypeScript, and more!

#### 1. Create a new project directory with "preact".

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

#### 4. Create a simple JavaScript application entrypoint:

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

- Open up your browser's Dev Tools, and browse your source code!
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

Check out our guides below for more inspiration!
