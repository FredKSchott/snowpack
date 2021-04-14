# @snowpack/web-test-runner-plugin

A [@web/test-runner](https://modern-web.dev/docs/test-runner/overview/) plugin to test Snowpack-powered projects. This plugin automatically connects to the Snowpack project in the current directory, loads the project configuration, and the uses your already-configured Snowpack build pipeline to build each test file.

## Usage

```
npm install @snowpack/web-test-runner-plugin --save-dev
```

```
// web-test-runner.config.js
module.exports = {
  plugins: [require('@snowpack/web-test-runner-plugin')()],
};
```

## Options

None! If you need to configure Snowpack, you can do so in your project `snowpack.config.js` file.

Looking for support for some missing option/configuration? Please file an isuse! Your feedback is important.
