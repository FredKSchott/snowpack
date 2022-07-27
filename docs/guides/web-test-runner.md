---
layout: ../../layouts/content.astro
title: '@web/test-runner'
tags: communityGuide
img: '/img/logos/modern-web.svg'
imgBackground: '#f2f2f8'
description: How to use @web/test-runner in your Snowpack project.
---

[@web/test-runner](https://www.npmjs.com/package/@web/test-runner) is our recommended test runner for Snowpack projects. Read more about why we recommend @web/test-runner in our [Snowpack Testing Guide](/guides/testing).

## Setup

This guide shows how to set up @web/test-runner and [@snowpack/web-test-runner-plugin](https://www.npmjs.com/package/@snowpack/web-test-runner-plugin) for a React project. The end result recreates the test configuration in [app-template-react](https://github.com/withastro/snowpack/blob/main/create-snowpack-app/app-template-react), one of our Create Snowpack App starter templates. If you're using a different framework, tweak React specific steps appropriately.

#### 1. Install dependencies

The base testing dependencies (don't hit Enter just yet!):

```
npm install --save-dev @web/test-runner @snowpack/web-test-runner-plugin chai
```

If using React, Vue, Svelte, or Preact, add the corresponding [Testing Library](https://testing-library.com/) (in this case `@testing-library/react`).

If using TypeScript, add `@types/mocha` and `@types/chai`.

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
+  "test": "web-test-runner \\\"src/**/*.test.jsx\\\"",
+  "test:watch": "npm run test -- --watch"
  ...
},
```

If needed, swap `.jsx` with the file type(s) containing your tests.

To specify multiple test file types, enclose with curly brackets and separate with commas. For example, to match `.jsx`, `.js`, and `.ts` files, the script would be:

```
"test": "web-test-runner \\\"src/**/*.test.{jsx,js,ts}\\\"",
```

`test:watch` will run in interactive mode, which automatically re-runs the tests when you change files.

> 💡 Tip: `wtr` can be used as a shorthand for `web-test-runner`.

#### 4. Add test code

Create a `sum.jsx` to your project:

```js
export function sum( a, b ) {
	return a + b;
}
```

Create a `sum.test.js` file in the same directory:

```js
import { expect } from 'chai';
import { sum } from './sum';

it( 'sums up 2 numbers', () => {
	expect( sum( 1, 1 ) ).to.equal( 2 );
	expect( sum( 3, 12 ) ).to.equal( 15 );
} );
```

#### 5. Run tests

Run `npm run test` or `npm run test:watch` in your terminal.

#### 6. More Information

In general, you should follow the documentation for [Web Test Runner](https://modern-web.dev/docs/test-runner/overview/) and [Chai](https://www.chaijs.com/api/).

⚠️ The WTR docs mention `--node-resolve`, but you don't need that. They also reference `@esm-bundle/chai`, but you should use `chai` instead.
