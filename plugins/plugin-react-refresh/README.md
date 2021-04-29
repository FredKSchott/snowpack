# @snowpack/plugin-react-refresh

Transforms JavaScript files containing React components automatically to enable React Fast Refresh via Snowpack's HMR API.

```
npm install --save-dev @snowpack/plugin-react-refresh
```

## Setup

```js
// snowpack.config.json
{
  "plugins": ["@snowpack/plugin-react-refresh", {/* options: see below */}]
}
```

## Plugin Options

| Name    |         Type          | Description                                                                                                                                                                                                                                                                             |
| :------ | :-------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `babel` | `boolean` or `object` | By default, this plugin uses Babel to add Fast-Refresh code to eligible JS files. If you want to configure & run this yourself, set `"babel": false"`. Alternatively, you can pass a custom Babel configuration object to enhance or override the defaults. Most users won't need this. |

## How it Works

This plugin will automatically inject HMR event handlers into any file containing a React component.

In most applications, you'll still want some top-level `import.meta.hot` handling code in your application for any non-React file updates. In our Create Snowpack App templates, this would be the HMR handling snippet found in `src/index.js`.
