## Get Started

### Installation

```toml
# Try Snowpack before installing:
npx snowpack      
# Installing Snowpack locally speeds up npx: 
npm install --save-dev snowpack
   (or) yarn add --dev snowpack
```


### Hello, World!

> 🆕 Check out **[`npx @pika/init`](https://github.com/pikapkg/init)**! Bootstrap a starter app with Snowpack, Preact, TypeScript, and more.

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
✔ snowpack installed: preact. [0.50s]
```

If all went well, you should see a `web_modules/` directory containing the file `preact.js`. This is the magic of Snowpack: you can import this file directly in your application and ship it all to the browser without a bundler.

Optionally, you can now run `npm install snowpack --save-dev` to speed up future Snowpack runs by installing the dependency locally in your project. Otherwise npx tends to re-install the tool before every run.


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

Look at that: No bundler needed! Any changes that you make to your src/app.js file are **immediately** reflected when you refresh your page. No bundlers, build steps, or waiting around required.

#### 6. Next Steps

- Open up your browser's Dev Tools and debug your application directly in the browser.
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
/* Babel Output:  lib/app.js (Remember to update your index.html) */
import { h, Component, render } from '/web_modules/preact.js';
// Create your app with HTM.
const app = (<div>Hello World!</div>);
// Render your app.
render(app, document.getElementById('app'));
```

- Add TypeScript to your project.
- Check out our guides below for more inspiration!
