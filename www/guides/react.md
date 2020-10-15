---
layout: layouts/guide.njk
permalink: '/guides/react/'
title: The Snowpack Guide to Getting Started with React
description: 'Get started with this in-depth tutorial on how to build React applications and websites with Snowpack. '
date: 2020-10-01
---

Image: ideally a nice header image showing the before or after, or some illustration with elements of the Snowpack logo, React, and symbols related to speed, joy.

Snowpack is a great fit for [React](https://reactjs.org/) projects of any size. It's easy to get started with and can scale to projects containing thousands of components and pages without any impact on development speed. Unlike traditional React application tooling, Snowpack saves you from getting bogged down with complex bundler setups and configuration files.

In this guide, you'll go from an empty directory to a fully configured Snowpack project with support for React and several other useful optimizations. In the process, you'll learn:

- How to set up Snowpack
- How to get started with React in a Snowpack project
- Importing CSS, images and other assets
- Enabling [Fast Refresh](https://reactnative.dev/docs/fast-refresh) mode for React
- Connecting your favorite developer tools to Snowpack

> 💡 Tip: if you want to jump to the end to see a full featured React setup, the [Create Snowpack App React template](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-react) comes with everything you'll learn in this tutorial plus other useful tools.
>
> ```bash
> npx create-snowpack-project react-snowpack-template --template @snowpack/project-template-react
> ```

Prerequisites: Snowpack is a command line tool installed from npm. This guide assumes a basic understanding of Node.js, npm, and how to run commands in the terminal. Knowledge of React is not required, Snowpack is a great way to learn React!

## Getting started with Snowpack and React

The easiest way to start a new Snowpack project is with [`create-snowpack-app`](<https://www.snowpack.dev/#create-snowpack-app-(csa)). `create-snowpack-app` is a tool to quickly set up Snowpack in a new directory. For this tutorial we're going to start with the bare-bones `@snowpack/app-template-minimal` template to quickly create a new directory with some basic HTML, CSS, and JavaScript files.

`create-snowpack-app` is a command line tool that creates a working Snowpack App based on a template. The template you're starting with here is `@snowpack/project-template-minimal` is a bare-bones setup where Snowpack serves an `index.html`, `index.css`, and `index.js`.

Open up your terminal and head to a directory where you want to put your new project. Now run `npx create-snowpack-project react-snowpack --template @snowpack/project-template-minimal`. This creates a new directory called `react-snowpack` and installs the `@snowpack/project-template-minimal` inside it.

You can now head to that new `react-snowpack` directory with `cd react-snowpack`. And to start up Snowpack run `npm run start`. You should see your new website up and running!

> 💡 Tip: the `README.md` in your new project contains useful information about what each file does.

Image: screenshot of project-template-minimal, which shows "Hello world" in text on a white background.

> 💡 Tip: you can also use Yarn for any of the commands in this tutorial.

Now that you have a basic project up and running, it's time to install React. To install React, run the following command in your project directory:

```bash
npm install react react-dom --save
```

> 💡 Tip: in this tutorial commands use `--save` for frontend libraries and `--save-dev` for your developer tools to keep them organized separately. This is totally up to you, though.

## Create your first React component

Snowpack has built in support for JSX in files with the `.jsx` extension. That means that there's no additional plugins or configuration needed to write your first React component, but you will need to rename your `index.js` file to `index.jsx` to take advantage of this.

```bash
mv index.js index.jsx
```

> 💡 Tip: You do not need to update your `index.html` script tag to point to `index.jsx`. Because JSX isn't supported in the browser, Snowpack builds your file to a runnable `.js` file. This is good to remember when you're referencing built files in HTML `<script src="">` and `<link href="">` elements.

You can now import React in `index.jsx` and add a simple test component just to make sure it's working:

```diff
/* Add JavaScript code here! */
- console.log('Hello World! You did! Welcome to Snowpack :D');
+import React from 'react';
+import ReactDOM from 'react-dom';
+ReactDOM.render(<div>"HELLO REACT"</div>, document.getElementById('root'));
```

Since the React code is rendering into an element with the ID `root`, we'll need to add that to `index.html`:

```diff
  <body>
-    <h1>Welcome to Snowpack!</h1>
+    <div id="root"></div>
    <script type="module" src="/index.js"></script>
```

Image: screenshot of the project, which shows "HELLO REACT" on a white background

You've just created your first React component in Snowpack! And also gotten your project prepared for building more with React.

## Customizing your file layout

If you're going to be adding a bunch of new files, you probably don't want them in the root directory. Snowpack is flexible enough to support whatever project layout that you prefer. For this guide, let's use a popular project layout from the React community.

A standard way of organizing React projects is an `src` directory for components and their associated files. Then a `public` directory for static assets like images, fonts, icons, and sometimes CSS. Lets update our project to use this popular structure.

```
📁 src
↳ index.jsx
📁 public
↳ index.css
↳ index.html
```

Provided are some commands that give the above project structure, you may prefer to use other tools like an IDE or text editor for this:

```bash
mkdir src
mkdir public
mv index.jsx src/index.jsx
mv index.html public/index.html
mv index.css public/index.css
```

Once your new structure is in place, you need to tell Snowpack about it. Every Snowpack project comes with a `snowpack.config.js` file for any configuration that you might need. Right now, you should see a mostly-empty, bare-bones config file. Add this to the empty `mount` object:

```diff
  mount: {
-    /* ... */
+    public: '/',
+    src: '/_dist_',
  },
```

`mount` is part of the [Snowpack Configuration API](https://www.snowpack.dev/#configuration). It allows you to customize the file structure of your project. The key is the name of the directory and the value is where you'd like them in the final build. With this new configuration, Snowpack will build files like `public/index.css` directory into `index.css`. So you won't need to change anything in `index.html` even though you've changed the directory of the original file.

But since you have changed the destination for files in `src`, Snowpack will build files like `src/index.js` directory into `/_dist_/index.js`. You'll need to change that path in `index.html` from `/index.js` to `/_dist_/index.js`.

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

Image: screenshot of the project, showing text saying "edit `src/App.jsx` and save to reload," text that says "Page has been open for" and the number of seconds then "seconds". A link with the text Learn React that links to the React website.

## Styling your Snowpack/React project

When you add assets like images or CSS, Snowpack includes them in your final build. If you already know React, this process should look pretty familiar.

> 💡 Tip: As you're doing this, you should not need to reload the page or restart Snowpack. Snowpack automatically updates the project in the browser as you edit code.

Add this file `logo.svg` (link to file) to your `src` directory. Now you can import it into your `App.jsx` and use it in an `img` tag to display it.

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

The project already has index.css for global styles. For CSS that's only for a specific component, a common design pattern is to add it in a CSS file with the same base name as the component. So the file for `App.jsx` would be `App.css` with this pattern.

> 💡 Tip: Snowpack has built-in support for [CSS Modules](https://www.snowpack.dev/#import-css-modules) and if you'd like to use SASS we have an official [SASS Plugin](https://www.snowpack.dev/#sass).

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

Image: screenshot. The page now has centered items, a grey background, styled fonts, and the React logo has an animation that rotates it.

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

> 💡 Tip: you'll need to restart Snowpack for the configuration changes to take effect

Now make an edit to `App.jsx`. If this worked you'll see it without the counter stopping or losing its value.

Image: GIF showing code side by side with the app. A change in made to App.jsx and it shows immediately when the file is changed. The counter keeps counting uninterrupted.

## Going further

Great job! You're now ready to build the React project if your dreams with Snowpack.

Image: Certificate with share buttons for Twitter

At this point you the basics and have a great starter for any React project. But if you take a look at our Snowpack React template you'll notice it has some other tools you might find useful

- [Prettier](https://prettier.io/) – a code formatter

- Tests- TODO

- [`@snowpack/plugin-dotenv`](https://github.com/pikapkg/snowpack/tree/master/plugins/plugin-dotenv) - Use `dotenv` in your Snowpack. This is useful for environment specific variables

If you'd like to use Typescript with Snowpack and React, checkout the [Snowpack React Typescript](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-react-typescript) starter.

If you have any questions, comments, or corrections, we'd love to here from you in the the Snowpack [discussion](https://github.com/pikapkg/snowpack/discussions) forum or the [Snowpack Discord community](https://discord.gg/rS8SnRk).
