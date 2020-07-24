# @snowpack/plugin-babel

Use Babel to build your files from source. Automatically inherits from your local project `.babelrc` or `babel.config.json` files.

```
npm install --save-dev @snowpack/plugin-babel
```

```js
// snowpack.config.json
{
  "plugins": ["@snowpack/plugin-babel"]
}
```

#### Default Build Script

```js
{
  // Matches all ".js", ".jsx", ".ts", and ".tsx" files
  "scripts": {"build:js,jsx,ts,tsx": "@snowpack/plugin-babel"}
}
```

You can override this by setting your own `"@snowpack/plugin-babel"` build script.

#### Plugin Options

None
