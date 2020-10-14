---
layout: layouts/guide.njk
permalink: '/guides/react/'
title: Snowpack + React Guide
description: 'Documentation and guides for building projects with Snowpack and React.'
date: 2020-10-01
---

Image: ideally a nice header image showing the before or after, or some illustration with elements of the Snowpack logo, React, and symbols related to speed, joy.

Snowpack is a great fit for [React](https://reactjs.org/) projects of any size. It's easy to get started with and can scale to projects containing thousands of components and pages without any impact on development speed. Unlike traditional React application tooling, Snowpack saves you from getting bogged down with complex bundler setups and configuration files.

In this guide, you'll go from a [minimal Snowpack project](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-minimal) to a Snowpack project with React and several useful developer optimizations. In the process you'll learn:

- How to set up a new Snowpack project
- How to get started with React in a Snowpack project
- Importing and using CSS and other assets inside your project
- Enabling [Fast Refresh](https://reactnative.dev/docs/fast-refresh) mode for React
- Extending Snowpack with plugins

> If you want to jump to the end to see a full featured React setup, the Create Snowpack App React template comes with everything you'll learn in this tutorial plus other useful tools.

Prerequisites: Snowpack is a command line tool installed from npm. This guide assumes a basic understanding of Node.js, npm, and how to run commands in the terminal. Knowledge of React is not required, Snowpack is a great way to learn React.

## Getting started with Snowpack and React

In this step by step you'll learn how to use the [`create-snowpack-app`](https://www.snowpack.dev/#create-snowpack-app-(csa) tool to spin up a working Snowpack project and then how to add React to it.

`create-snowpack-app` is a command line tool that creates a working Snowpack App based on a template. The template you're starting with here is `@snowpack/project-template-minimal is` a bare-bones setup where Snowpack serves an index.html, index.css, and index.js.

```bash
npx create-snowpack-project react-snowpack --template @snowpack/project-template-minimal
cd react-snowpack
npm run start
```

Image: screenshot of project-template-minimal, which shows "Hello world" in text on a white background

This is about as basic as it gets. When you run `npm start` Snowpack serves an `index.html`, `index.css`, and `index.js`.

> The `README.md` contains useful information about what each file does.

The first thing that you'll want to do is install React in your project. To do that, run the following command in your project directory:

To install these you can run:

```bash
npm install react react-dom --save
```

> In this tutorial commands use `--save` for frontend libraries and `--save-dev` for your developer tools to keep them organized separately. This is totally up to you, though.

## Create your first React component

React uses a syntax called [JSX](https://reactjs.org/docs/introducing-jsx.html) for components. Snowpack has built in support for JSX files with the extension `.jsx`. To create your first React component in Snowpack rename `index.js` to `index.jsx`.

> You may have used JSX in `.js` files before, but Snowpack expects JSX to be .jsx files

```bash
mv index.js index.jsx
```

> Remember that your index.html file is importing `/index.js`, not `/index.js`. Do you need to update it to match the new file? You don't because Snowpack turns `index.jsx` (which wouldn't run in the browser) into the `index.js` (which would).

You can now import React into `index.jsx` and render a simple test component just to make sure it's working.

Import React and add this test component `index.jsx` so you can use it.

```diff
/* Add JavaScript code here! */
- console.log('Hello World! You did! Welcome to Snowpack :D');
+import React from 'react';
+import ReactDOM from 'react-dom';
+ReactDOM.render(<div>"HELLO REACT"</div>, document.getElementById('root'));
```

If you run this code you'll get `Error: Target container is not a DOM element.` The call to `document.getElementById('root')` is failing because the HTML page has no element with that ID. Head to index.html and add one in the `<body>`

```diff
  <body>
-    <h1>Welcome to Snowpack!</h1>
+    <div id="root"></div>
    <script type="module" src="/index.js"></script>
```

Now it should run and you should see "HELLO REACT"

Image: screenshot of the project, which shows "HELLO REACT" on a white background

## Organizing your files

If you're going to be adding a bunch of new files, you probably don't want them in the root directory. A standard way of organizing React projects is an `src` directory for components and their associated files. Then a public directory for static assets like images, fonts, icons, and sometimes CSS. To do this you'll need to reorganize your files, then tell Snowpack about it in the configuration file, and update your paths in index.html.

```
📁 src
↳ index.jsx
📁 public
↳ index.css
↳ index.html
```

```bash
mkdir src
mkdir public
mv index.jsx src/index.jsx
mv index.html public/index.html
mv index.css public/index.css
```

You need to tell Snowpack about this new structure using the [Snowpack Configuration API](https://www.snowpack.dev/#configuration) in the `snowpack.config.js` file. Right now it's a bare bones scaffold that doesn't do anything. Add this to the `mount` object:

```diff
  mount: {
-    /* ... */
+    public: '/',
+    src: '/_dist_',
  },
```

This tells it look at `public` instead of look at `/` for the index. For example when building `index.css`, Snowpack looks for this files in `./public/index.css`.

And it also tells it to put the final output files in a subdirectory called `_dist_` so change that path in `index.html` from `/index.js` to `/_dist_/index.js`.

```diff
    <h1>Welcome to Snowpack!</h1>
    <div id="root"></div>
-    <script type="module" src="/index.js"></>
+    <script type="module" src="/_dist_/index.js"></script>
  </body>
```

If Snowpack is still running, exit the process, you need to restart Snowpack for configuration file changes. When you start up again, if it worked, it should look the same.

Create a new file at `src/App.jsx` and paste the following code into this new file to create an `App` component:

```jsx
import React, {useState, useEffect} from 'react';

function App() {
  // Create the count state.
  const [count, setCount] = useState(0);
  // Create the counter (+1 every second).
  useEffect(() => {
    const timer = setTimeout(() => setCount(count + 1), 1000);
    return () => clearTimeout(timer);
  }, [count, setCount]);
  // Return the App component.
  return (
    <div className="App">
      <header className="App-header">
        <p>
          Edit <code>src/App.jsx</code> and save to reload.
        </p>
        <p>
          Page has been open for <code>{count}</code> seconds.
        </p>
        <p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </p>
      </header>
    </div>
  );
}

export default App;
```

Now include it in `index.js`

```diff
import React from 'react';
import ReactDOM from 'react-dom';
+ import App from './App';

- ReactDOM.render(<div>"HELLO WORLD"</div>, document.getElementById('root'));
+ ReactDOM.render(
+    <React.StrictMode>
+      <App />
+    </React.StrictMode>,
+    document.getElementById('root'),
+  );
```

> [Strict Mode](https://reactjs.org/docs/strict-mode.html) is a tool for highlighting potential problems in React code.

You shouldn't need to restart Snowpack to see this, it should look like this:

IMAGE: screenshot of the project, showing text saying "edit `src/App.js` and save to reload," text that says "Page has been open for" and the number of seconds then "seconds". A link with the text Learn React that links to the React website.

## Styling your Snowpack/React project

When you add assets like images or CSS, Snowpack includes them in your final build. If you already know React, this process should look pretty familiar.

> As you're doing this, you should not need to reload the page or restart Snowpack. Snowpack updates the project in the browser as you edit code, which is pretty nifty.

Add this file `logo.svg` (link to file) to `src`. Now you can import it into your `App.jsx` and use it in an `img` tag to display it.

```diff
import React, { useState, useEffect } from 'react';
+ import logo from './logo.svg';

function App() {
  // Create the count state.
  const [count, setCount] = useState(0);
  // Create the counter (+1 every second).
  useEffect(() => {
    const timer = setTimeout(() => setCount(count + 1), 1000);
    return () => clearTimeout(timer);
  }, [count, setCount]);
  // Return the App component.
  return (
    <div className="App">
      <header className="App-header">
+        <img src={logo} className="App-logo" alt="logo" />
```

Image: the React logo (a blue atom) is now at the top of the page

The project already has index.css for global styles, but component CSS can help keep code organized. Snowpack knows to only load this CSS when displaying the `App` component, which means it's not loading unnecessary CSS.

Create `src/App.css` and add this CSS:

```css
.App {
  text-align: center;
}
.App code {
  background: #fff3;
  padding: 4px 8px;
  border-radius: 4px;
}
.App p {
  margin: 0.4rem;
}
.App-logo {
  height: 40vmin;
  pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
  .App-logo {
    animation: App-logo-spin infinite 20s linear;
  }
}

.App-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}

.App-link {
  color: #61dafb;
}

@keyframes App-logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

To use it, import it `App.jsx` with

```diff
import logo from './logo.svg';
+import './App.css';
```

Image: screenshot or GIF. The page now has centered items, a grey background, styled fonts, and the React logo has an animation that rotates it

You may notice the page has a white border, which doesn't look so great. That's due to a global style. Go to `index.css` and edit the CSS to remove it:

```diff
/* Add CSS styles here! */
body {
  font-family: sans-serif;
-  margin: 2em 1em;
+  margin: 0;
  line-height: 1.5em;
}
```

Image:

## Adding React Fast Refresh with a Snowpack plugin

[React Fast Refresh](https://reactnative.dev/docs/fast-refresh)? What's that? It's a developer tool that makes it much easier to see how updates to your code work in the browser. React projects are often interactive and include state. For example, this project you're building has a state that is the amount of time on the page. When developing with state it's useful not to lose it while you edit code. React Fast Refresh shows you updates without refreshing the entire page. Showing you how to add this is also a good intro to Snowpack plugins. Snowpack starts with a minimal setup with the perspective that you can add what you need through the plugin system.

Start by enabling [Hot Module Replacement](https://www.snowpack.dev/#hot-module-replacement), a requirement for Fast Refresh. Snowpack automatically refreshes to show changes in your code. Hot Module Replacement only updates the components that changed without refreshing the whole page. You can enable it for React with a small snippet of code in `index.jsx`.

Head to `index.jsx` and add this snippet at the bottom:

```diff
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root'),
);
+// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
+// Learn more: https://www.snowpack.dev/#hot-module-replacement
+if (import.meta.hot) {
+  import.meta.hot.accept();
+ }
```

Now when you change `App.jsx` the changes show without the whole page refreshing.

Image: GIF showing code side by side with the project. A change in made to App.jsx and it shows when the changed file is saved. But the counter resets to 0.

However, if you make a change to App.jsx, you'll see the counter on the page reset to 0, even though the page itself hasn't fully refreshed. React Fast Refresh solves this.

Installing a plugin involves installing the module and then enabling it in the Snowpack configuration file.

Install the module first by running.

```bash
npm install @snowpack/plugin-react-refresh --save-dev
```

To enable it head to `snowpack-config.js` and add it to the array of plugins

```diff
module.exports = {
  mount: {
    public: '/',
    src: '/_dist_',
  },
  plugins: [
+    '@snowpack/plugin-react-refresh'
  ],
};
```

> you'll need to restart Snowpack

Now make an edit to `App.jsx`. If this worked you'll see it without the counter stopping or losing its value.

Image: GIF showing code side by side with the app. A change in made to App.jsx and it shows immediately when the file is changed. The counter keeps counting uninterrupted.

## Going further

Great job! You're now ready to build the React project if your dreams with Snowpack.

Image: Certificate with share buttons for Twitter

At this point you the basics and have a great starter for any React project. But if you take a look at our Snowpack React template you'll notice it has some other tools you might find useful

- [Prettier](https://prettier.io/) – a code formatter

- Tests

- [`@snowpack/plugin-dotenv`](https://github.com/pikapkg/snowpack/tree/master/plugins/plugin-dotenv) - Use `dotenv` in your Snowpack. This is useful for environment specific variables

If you'd like to use Typescript with Snowpack and React, checkout the [Snowpack React Typescript](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-react-typescript) starter.

If you have any questions, comments, or corrections, we'd love to here from you in the the Snowpack [discussion](https://github.com/pikapkg/snowpack/discussions) forum or the [Snowpack Discord community](https://discord.gg/rS8SnRk).
