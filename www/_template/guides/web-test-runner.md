---
layout: layouts/content.njk
title: '@web/test-runner'
tags: communityGuide
img: '/img/logos/modern-web.svg'
imgBackground: '#f2f2f8'
description: How to use @web/test-runner in your Snowpack project.
---

[@web/test-runner](https://www.npmjs.com/package/@web/test-runner) is our recommended test runner for Snowpack projects. Read more about why we recommend @web/test-runner in our [Snowpack Testing Guide](/guides/testing).

To use [@web/test-runner](https://www.npmjs.com/package/@web/test-runner) in your project, [follow the instructions here](https://modern-web.dev/docs/test-runner/overview/). Then install the Snowpack plugin with `npm install --save-dev @snowpack/web-test-runner-plugin`. Then add a `web-test-runner.config.js` file:

```js
// web-test-runner.config.js
process.env.NODE_ENV = 'test';

module.exports = {
  plugins: [require('@snowpack/web-test-runner-plugin')()],
};
```

[See an example setup](https://github.com/snowpackjs/snowpack/blob/main/create-snowpack-app/app-template-react) in one of our Create Snowpack App starter templates.

> Note that tests must be in mounted directories or they won't run correctly. For example in the [app-template-react](https://github.com/snowpackjs/snowpack/blob/main/create-snowpack-app/app-template-react), tests in `/src` will run correctly since it's mounted in `snowpack.config.js`. If you put a test in a new directory like `/test` it will fail to run.
