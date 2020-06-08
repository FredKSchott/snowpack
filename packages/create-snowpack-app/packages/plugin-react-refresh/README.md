# @snowpack/plugin-react-refresh

Transforms JavaScript files containing React components automatically to enable React Fast Refresh. Connects to Snowpack's Hot Module Replacement (HMR) API.

```
npm install --save-dev @snowpack/plugin-react-refresh
```

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
  "plugins": [
    "react-refresh/babel"
  ]
}
```

#### Default Build Script

```js
{
  "scripts": {"bundle:*": "@snowpack/plugin-react-refresh"}
}
```

#### Plugin Options

None
