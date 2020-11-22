---
layout: layouts/main.njk
title: Testing
tags: guides
---

Snowpack supports any popular JavaScript testing framework that you're already familiar with. Mocha, Jest, Jasmine, AVA and Cypress are all supported in Snowpack applications.

We currently recommend [@web/test-runner](https://www.npmjs.com/package/@web/test-runner) (WTR) for testing in Snowpack projects. When benchmarked it performed faster than Jest (our previous recommendation) while also providing an environment for testing that more closely matches the actual browser that your project runs in. Most importantly, WTR runs the same Snowpack build pipeline that you've already configured for your project, so there's no extra build configuration needed to run your tests. Jest (and many others) ask you to configure a totally secondary build pipeline for your tests, which reduces test confidence while adding 100s of extra dependencies to your project.

To use [@web/test-runner](https://www.npmjs.com/package/@web/test-runner) in your project, [follow the instructions here](https://modern-web.dev/docs/test-runner/overview/) and make sure that you add the Snowpack plugin to your config file:

```js
// web-test-runner.config.js
module.exports = {
  plugins: [require('@snowpack/web-test-runner-plugin')()],
};
```

[See an example setup](https://github.com/snowpackjs/snowpack/blob/main/create-snowpack-app/app-template-react) in one of our Create Snowpack App starter templates.

### @web/test-runner

[@web/test-runner](https://www.npmjs.com/package/@web/test-runner) is our recommended test runner for Snowpack projects. [See our section on testing](/#testing) for detailed instructions on how to get started with @web/test-runner.

### Jest

> Update (October 11, 2020): **We now recommend [@web/test-runner](https://www.npmjs.com/package/@web/test-runner) as our test runner of choice for Snowpack projects.** [See our section on testing](/#testing) for more background behind the change.

[Jest](https://jestjs.io/) is a popular Node.js test runner for Node.js & web projects. Jest can be used with any frontend project as long as you configure how Jest should build your frontend files to run on Node.js. Many projects will try to manage this configuration for you, since it can get complicated.

Snowpack ships pre-built Jest configuration files for several popular frameworks. If you need to use Jest for any reason,consider extending one of these packages:

- React: [@snowpack/app-scripts-react](https://www.npmjs.com/package/@snowpack/app-scripts-react)
- Preact: [@snowpack/app-scripts-preact](https://www.npmjs.com/package/@snowpack/app-scripts-preact)
- Svelte: [@snowpack/app-scripts-svelte](https://www.npmjs.com/package/@snowpack/app-scripts-svelte)

You can use these packages in your project like so:

```js
// jest.config.js
// Example: extending a pre-built Jest configuration file
module.exports = {
  ...require('@snowpack/app-scripts-preact/jest.config.js')(),
};
```
