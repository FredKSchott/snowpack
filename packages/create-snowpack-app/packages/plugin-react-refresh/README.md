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

#### Default Build Script

```js
{
  "scripts": {"bundle:*": "@snowpack/plugin-react-refresh"}
}
```

#### Plugin Options

None
