---
layout: layouts/content.njk
title: '@web/test-runner'
tags: communityGuide
img: '/img/logos/modern-web.svg'
imgBackground: '#f2f2f8'
description: How to use @web/test-runner in your Snowpack project.
---

[@web/test-runner](https://www.npmjs.com/package/@web/test-runner) is our recommended test runner for Snowpack projects. Read more about why we recommend @web/test-runner in our [Snowpack Testing Guide](/guides/testing).

## Setup
This guide shows how to set up @web/test-runner and [@snowpack/web-test-runner-plugin](https://www.npmjs.com/package/@snowpack/web-test-runner-plugin) for a React project. The end result recreates the test configuration in [app-template-react](https://github.com/snowpackjs/snowpack/blob/main/create-snowpack-app/app-template-react), one of our Create Snowpack App starter templates. If you're using a different framework, tweak React specific steps appropriately.

#### 1. Install dependencies
```
npm i -D @web/test-runner @snowpack/web-test-runner-plugin chai @testing-library/react
```

If using TypeScript, install `@types/mocha` and `@types/chai` as well.

In addition to React, [Testing Library](https://testing-library.com/) also has libraries for Vue, Svelte, Preact, and more.

#### 2. Configure

Create a new `web-test-runner.config.js` file in your project root:

```js
process.env.NODE_ENV = 'test';

module.exports = {
  plugins: [require('@snowpack/web-test-runner-plugin')()],
};
```

⚠️ Don't add @snowpack/web-test-runner-plugin to plugins in your `snowpack.config.mjs` file! It only needs to be in `web-test-runner.config.js`. If you need to specify test options, use [testOptions](https://www.snowpack.dev/reference/configuration#testoptions).

#### 3. Script

Add a `test` script to your project `package.json`:
```diff
"scripts": {
  "start": "snowpack dev",
  "build": "snowpack build",
+  "test": "web-test-runner \"src/**/*.test.jsx\"",
  ...
},

```

To specify multiple test file types, enclose with curly brackets and separate with commas. For example, to match `.jsx`, `.js`, and `.ts` files, the script would be:

```
"test": "web-test-runner \"src/**/*.test.{jsx,js,ts}\"",
```

> 💡 Tip: `wtr` can be used as a shorthand for `web-test-runner`.
