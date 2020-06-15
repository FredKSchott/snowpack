# @snowpack/plugin-parcel

Use Parcel to bundle your application for production. Uses Parcel v1.

```
npm install --save-dev @snowpack/plugin-parcel
```

```js
// snowpack.config.json
{
  "plugins": ["@snowpack/plugin-parcel"]
}
```

⚠️ **NOTE:** Parcel v1.x does not support Snowpack's usage of `import.meta`. This means that `@snowpack/plugin-parcel` won't work for Snowpack applications that make use of HMR (`import.meta.hot`) or custom environment variables (`import.meta.env`). If you need to use either, check out [@snowpack/plugin-webpack](/packages/plugin-webpack) instead.

#### Default Build Script

```js
{
  "scripts": {"bundle:*": "@snowpack/plugin-parcel"}
}
```

#### Plugin Options

None
