---
layout: layouts/guide.njk
permalink: '/guides/react/'
title: The Snowpack Guide to Getting Started with React
description: 'Get started with this in-depth tutorial on how to build React applications and websites with Snowpack. '
date: 2020-10-01
---

<img src="/img/react-guide.png" alt="header image, showing the React and Snowpack logo against a background of blue mountains" />

Snowpack is a great fit for [React](https://reactjs.org/) projects of any size. It's easy to get started and can scale to projects containing thousands of components and pages without any impact on development speed. Unlike traditional React application tooling, Snowpack saves you from getting bogged down with complex bundler setups and configuration files.

In this guide, you'll go from an empty directory to a fully configured Snowpack project with support for React and several other useful developer tools. In the process, you'll learn:

- How to set up Snowpack
- How to get started with React in a Snowpack project
- Importing CSS, images and other assets
- Enabling [Fast Refresh](https://reactnative.dev/docs/fast-refresh) mode for React
- Connecting your favorite developer tools to Snowpack

> 💡 Tip: if you want to jump to the end to see a full featured React setup, the [Create Snowpack App React template](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-react) comes with everything you'll learn in this guide plus other useful tools.

Prerequisites: Snowpack is a command line tool installed from npm. This guide assumes a basic understanding of Node.js, npm, and how to run commands in the terminal. Knowledge of React is not required, Snowpack is a great way to learn React!

## Getting started with Snowpack and React

The easiest way to start a new Snowpack project is with [Create Snowpack App](<https://www.snowpack.dev/#create-snowpack-app-(csa)>), a tool to set up Snowpack in a new directory.

You'll start with the `@snowpack/project-template-minimal` template, a simple, bare-bones Snowpack project setup that the rest of this guide builds on.

To get started, open your terminal and head to a directory where you want to put your new project. Now run the following command in your terminal to create a new directory called `react-snowpack` with the minimal template automatically installed.

```bash
npx create-snowpack-project react-snowpack --template @snowpack/project-template-minima
```

You can now head to the new directory and start Snowpack with the following two commands:

```bash
cd react-snowpack
npm run start
```

You should see your new website up and running!

> 💡 Tip: the `README.md` in your new project contains useful information about what each file does.

<img src="/img/guides/react/minimalist-hello-world.png" alt="screenshot of project-template-minimal, which shows 'Hello world' in text on a white background." class="screenshot"/>

> 💡 Tip: you can also use Yarn for any of the commands in this guide.

Now that you have a basic project up and running, to install React, run the following command in your project directory:

```bash
npm install react react-dom --save
```

> 💡 Tip: in this guide commands use `--save` for frontend libraries and `--save-dev` for your developer tools to keep them organized separately. This is totally up to you, though.

## Create your first React component

React relies on a special templating language called JSX. Snowpack has built in support for JSX in files with the `.jsx` extension. That means that there's no plugins or configuration needed to write your first React component. Rename `index.js` file to `index.jsx` so that Snowpack knows it's now a JSX file:

```bash
mv index.js index.jsx
```

> 💡 Tip: you do not need to update your `index.html` script tag to point to `index.jsx`. Because JSX isn't supported in the browser, Snowpack builds your file to a runnable `.js` file. This is good to remember when you're referencing built files in HTML `<script src="">` and `<link href="">` elements.

You can now import React in `index.jsx` and add a simple test component just to make sure it's working:

```diff
/* Add JavaScript code here! */
- console.log('Hello World! You did! Welcome to Snowpack :D');
+import React from 'react';
+import ReactDOM from 'react-dom';
+ReactDOM.render(<div>"HELLO REACT"</div>, document.getElementById('root'));
```

Since the React code is rendering into an element with the ID `root`, you'll need to add that to `index.html`:

```diff
  <body>
-    <h1>Welcome to Snowpack!</h1>
+    <div id="root"></div>
    <script type="module" src="/index.js"></script>
```

<img src="/img/guides/react/minimalist-hello-world-react.png" alt="screenshot of the project, which shows 'HELLO REACT' on a white background" class="screenshot"/>

You've just created your first React component in Snowpack!

## Customize your project layout

Since you'll be adding a bunch of new files, you probably don't want them crowding up your top-level root directly. Snowpack is flexible enough to support whatever project layout that you prefer. In this guide, you'll learn how to use a popular project pattern from the React community.

```
📁 src : your React components and their assets (CSS, images)
↳ index.jsx
📁 public : global assets like images, fonts, icons, and global CSS
↳ index.css
↳ index.html
```

Use your favorite visual editor to rearrange and rename, or run these commands in the terminal:

```bash
mkdir src
mkdir public
mv index.jsx src/index.jsx
mv index.html public/index.html
mv index.css public/index.css
```

This changes how Snowpack builds the files since by default Snowpack scans all directories:

```
/ (builds to → /)
📁 src
↳ index.jsx (builds to → src/index.js)
📁 public
↳ index.css (builds to → public/index.css)
↳ index.html (builds to → public/index.html)
```

This means if you are running Snowpack right now, the site is now broken as the files are all in different places. Snowpack Configuration allows you to fix this by changing what directories Snowpack scans and where they output. Every Snowpack project comes with a `snowpack.config.js` file for any configuration that you might need. Right now, you should see a configuration file with empty options. Add this to the empty `mount` object:

```diff
  mount: {
-    /* ... */
+ // directory name: 'build directory'
+    public: '/',
+    src: '/_dist_',
  },
```

This configuration changes the build to:

```
/ (ignored in case you have files in here you might not want in your final build)
📁 src
↳ index.jsx (builds to → _dist_/index.js)
📁 public
↳ index.css (builds to → index.css)
↳ index.html (builds to → index.html)
```

`mount` is part of the [Snowpack Configuration API](https://www.snowpack.dev/#configuration). It allows you to customize the file structure of your project. The key is the name of the directory and the value is where you'd like them in the final build. With this new configuration, Snowpack builds files in `public` like `public/index.css` directory into `index.css`. It builds files in `src` like `src/index.js` into `/_dist_/index.js`, so you'll need to change that path in your `index.html`:

```diff
    <h1>Welcome to Snowpack!</h1>
    <div id="root"></div>
-    <script type="module" src="/index.js"></>
+    <script type="module" src="/_dist_/index.js"></script>
  </body>
```

You'll need to restart Snowpack for configuration file changes. When you start up again, if it worked, it should look the same.

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
          Page has been open for <code>{count}</code> seconds.
        </p>
      </header>
    </div>
  );
}

export default App;
```

Now include it in `index.jsx`

```diff
import React from 'react';
import ReactDOM from 'react-dom';
+ import App from './App.jsx';

- ReactDOM.render(<div>"HELLO WORLD"</div>, document.getElementById('root'));
+ ReactDOM.render(
+    <React.StrictMode>
+      <App />
+    </React.StrictMode>,
+    document.getElementById('root'),
+  );
```

> 💡 Tip: [Strict Mode](https://reactjs.org/docs/strict-mode.html) is a tool for highlighting potential problems in React code.

You shouldn't need to restart Snowpack to see this, it should look like this:
<img src="/img/guides/react/minimalist-hello-world-react-timer.png" alt="screenshot of the project with text that says 'Page has been open for' and the number of seconds then 'seconds'" class="screenshot"/>

## Styling your Snowpack/React project

When you add assets like images or CSS, Snowpack includes them in your final build. If you already know React, this process should look pretty familiar.

> 💡 Tip: as you're doing this, you should not need to reload the page or restart Snowpack. Snowpack automatically updates the project in the browser as you edit code.

Add this file [`logo.svg`](https://github.com/snowpackjs/snowpack/blob/master/create-snowpack-app/app-template-react/src/logo.svg) to your `src` directory. Now you can import it into your `App.jsx` and use it in an `img` tag to display it.

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
        <p>
```

<img src="/img/guides/react/minimalist-hello-world-react-logo.png" alt="the React logo (a blue atom) is now at the top of the page" class="screenshot"/>

The project already has index.css for global styles. For CSS that's only for a specific component, a common design pattern is to add it in a CSS file with the same base name as the component. The style file for `App.jsx` would be `App.css` with this pattern.

> 💡 Tip: Snowpack has built-in support for [CSS Modules](https://www.snowpack.dev/#import-css-modules) and if you'd like to use SASS there is an official [SASS Plugin](https://www.snowpack.dev/#sass).

Create `src/App.css` and add this CSS:

```css
.App {
  text-align: center;
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

<img src="/img/guides/react/react.gif" alt="The page now has centered items, a grey background, styled fonts, and the React logo has an animation that rotates it." class="screenshot"/>

## Making Snowpack Even Faster with Fast Refresh

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
+}
```

Now when you change `App.jsx` the changes show without the whole page refreshing.

Image: GIF showing code side by side with the project. A change in made to App.jsx and it shows when the changed file is saved. But the counter resets to 0.

The counter on the page still resets to 0, even though the page itself hasn't fully refreshed. This can be annoying if you're trying to debug state. React Fast Refresh solves this.

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

> 💡 Tip: you'll need to restart Snowpack for the configuration changes to take effect

Now make an edit to `App.jsx`. If this worked you'll see it without the counter stopping or losing its value.

Image: GIF showing code side by side with the app. A change in made to App.jsx and it shows immediately when the file is changed. The counter keeps counting uninterrupted.

## Going further

Great job! You're now ready to build the React project of your dreams with Snowpack.

Image: Certificate with share buttons for Twitter

At this point you have the basics and have a great starter for any React project. But if you compare with the official [Snowpack React template](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-react) you'll notice it has some other developer tools you might find useful:

- [Prettier](https://prettier.io/)—a code formatter

- Tests- TODO

- [`@snowpack/plugin-dotenv`](https://github.com/pikapkg/snowpack/tree/master/plugins/plugin-dotenv) - Use `dotenv` in your Snowpack. This is useful for environment specific variables

If you'd like to use Typescript with Snowpack and React, checkout the [Snowpack React Typescript](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-react-typescript) starter.

If you have any questions, comments, or corrections, we'd love to hear from you in the Snowpack [discussion](https://github.com/pikapkg/snowpack/discussions) forum or our [Snowpack Discord community](https://discord.gg/rS8SnRk).
