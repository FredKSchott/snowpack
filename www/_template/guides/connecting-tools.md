---
layout: layouts/guide.njk
title: The Snowpack Guide to connecting your favorite tools
description: 'How do you use your favorite tools in Snowpack? This Guide will help you get started'
tags: guides
sidebarTitle: Connecting your favorite tools
---

One of the biggest questions we get in our discussion forums and Discord is how to connect tools to Snowpack. EsLint, PostCSS, SASS, and any other of the useful tools developers use to build JavaScript these days. In this Guide we'll go over how to use your favorite tools with Snowpack. Almost all work with just a few additions to a configuration file.

## The three ways

It's worth first going over the three ways and their pros and cons:

- Snowpack plugins
- Run scripts using Snowpack
- Run scripts outside of Snowpack (in `package.json`)

## Plugin

Usually Snowpack plugins are the easiest way to use your favorite tools. Snowpack plugins are built to require no configuration, but if you do want to do configuration, they are built with that in mind too!

Snowpack has a [growing plugin ecosystem](/plugins). Adding a plugin is two steps: install the Plugin using your package manager and then tell Snowpack about it by adding the name of the plugin to the Snowpack config file. Configuration options are covered in each plugin's documentation.

If there isn't a plugin yet, you might be interested in making one. Check out our [Guide to creating a plugin](/guide/plugins)

## Connect any other Script/CLI using plugin-run-script and plugin-build-script

If you can't find a plugin that fits your needs and don't want to write your own, you can also run CLI commands directly as a part of your build using one of our two utility plugins: `@snowpack/plugin-build-script` & `@snowpack/plugin-run-script`.

#### @snowpack/plugin-build-script

```js
// snowpack.config.json
// [npm install @snowpack/plugin-build-script]
{
  "plugins": [
    ["@snowpack/plugin-build-script", { "cmd": "postcss", "input": [".css"], "output": [".css"]}]
  ],
}
```

This plugin allows you to connect any CLI into your build process. Just give it a `cmd` CLI command that can take input from `stdin` and emit the build result via `stdout`. Check out the README for more information.

#### @snowpack/plugin-run-script

```js
// snowpack.config.json
// [npm install @snowpack/plugin-run-script]
{
  "plugins": [
    ["@snowpack/plugin-run-script", { "cmd": "eleventy", "watch": "$1 --watch" }]
  ],
}
```

This plugin allows you to run any CLI command as a part of your dev and build workflow. This plugin doesn't affect your build output, but it is useful for connecting developer tooling directly into Snowpack. Use this to add meaningful feedback to your dev console as you type, like TypeScript type-checking and ESLint lint errors.

### Examples

#### PostCSS

```js
// snowpack.config.json
"plugins": [
  ["@snowpack/plugin-build-script", {"cmd": "postcss", "input": [".css"], "output": [".css"]}]
]
```

The [`postcss-cli`](https://github.com/postcss/postcss-cli) package must be installed manually. You can configure PostCSS with a `postcss.config.js` file in your current working directory.

#### ESLint

```js
// snowpack.config.json
"plugins": [
  ["@snowpack/plugin-run-script", {
    "cmd": "eslint \"src/**/*.{js,jsx,ts,tsx}\"",
    // Optional: Use npm package "watch" to run on every file change
    "watch": "watch \"$1\" src"
  }]
]
```

## Running scripts outside of Snowpack

The third option is running the tool completely outside of Snowpack. This sometimes has an advantage if don't need it to run at the same time as Snowpack. This docs site for example runs PostCSS outside of Snowpack. It's not used in the dev server, only on build, so there is really no advantage to adding it to Snowpack. Our build script in `package.json` runs PostCSS:

`"build": "ELEVENTY_ENV=prod yarn build:sass && snowpack build && yarn build:css"`

Sass is also run outside of Snowpack but the next release of docs we'll use the `@snowpack/plugin-sass` plugin instead. It didn't exist when we first set up the docs so we had been using [Concurrently](https://github.com/kimmobrunfeldt/concurrently) to run a sass watcher and Snowpack at the same time.
