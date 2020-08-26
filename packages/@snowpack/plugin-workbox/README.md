# @snowpack/plugin-workbox

Use `workbox` to build a service worker for your production application. To learn more about `workbox`, click [here](https://developers.google.com/web/tools/workbox)


## Install

```
npm install --save-dev @snowpack/plugin-workbox
```

## Usage

Workbox exposes 2 primary ways of building service workers, `generateSW` and `injectManifest`. These are exposed as 2 plugins in the `@snowpack/plugin-workbox`.

### `generateSW`

Import the `generateSW` plugin from `@snowpack/plugin-workbox`, and add it to your plugins array in your `snowpack.config.js`. 

```js
// snowpack.config.js
const { generateSW } = require('@snowpack/plugin-workbox')

module.exports = {
  "plugins": [
    [generateSW, { /* see "Plugin Options" below */}]]
}
```

#### Plugin Options

The plugin takes a workbox config object as an argument. You can find a detailed list of supported properties for the workbox config object [here](https://developers.google.com/web/tools/workbox/reference-docs/latest/module-workbox-build#.generateSW).

This plugin requires:

- `swDest: string` - The path and filename of the service worker file that will be created by the build process, relative to the current working directory. It must end in '.js'.


### `injectManifest`

Import the `injectManifest` plugin from `@snowpack/plugin-workbox`, and add it to your plugins array in your `snowpack.config.js`. 

```js
// snowpack.config.js
const { injectManifest } = require('@snowpack/plugin-workbox')

module.exports = {
  "plugins": [
    [injectManifest, { /* see "Plugin Options" below */}]]
}
```

#### Plugin Options

The plugin takes a workbox config object as an argument. You can find a detailed list of supported properties for the workbox config object [here](https://developers.google.com/web/tools/workbox/reference-docs/latest/module-workbox-build#.injectManifest).

This plugin requires:

- `swSrc: string` - The path and filename of the service worker file that will be read during the build process, relative to the current working directory.
- `swDest: string` - The path and filename of the service worker file that will be created by the build process, relative to the current working directory. It must end in '.js'.

