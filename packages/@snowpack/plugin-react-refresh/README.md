# @snowpack/plugin-react-refresh

Transforms JavaScript files containing React components automatically to enable React Fast Refresh via Snowpack's HMR API. 

```
npm install --save-dev @snowpack/plugin-react-refresh
```

## Setup

```js
// snowpack.config.json
{
  "plugins": ["@snowpack/plugin-react-refresh"]
}
```

In addition, you have to add `react-refresh/babel` as a plugin to your babel configuration:

```js
// babel.config.json
{
  "env": {
    "development": {
      "plugins": [
        "react-refresh/babel"
      ]
    }
  }
}
```


## Plugin Options

None

## How it Works

This plugin will automatically inject HMR event handlers into any file containing a React component. 

In most applications, you'll still want some top-level `import.meta.hot` handling code in your application for any non-React file updates. In our Create Snowpack App templates, this would be the HMR handling snippet found in `src/index.js`.
