# @snowpack/plugin-babel

Use Babel to build your files from source. Automatically inherits from your local project `.babelrc` or `babel.config.json` files.

```
npm install --save-dev @snowpack/plugin-babel
```

```js
// snowpack.config.json
{
  "plugins": [
    [
      "@snowpack/plugin-babel",
      {
        "input": ['.js', '.mjs', '.jsx', '.ts', '.tsx'], // (optional) specify files for Babel to transform
        transformOptions: {
          // babel transform options
        }
      }
    ]
  ]
}
```

#### Plugin Options

| Name               | Type       | Description                                                                                                                                        |
| :----------------- | :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input`            | `string[]` | (optional) By default, Babel scans & transfoms these extensions: `['.js', '.mjs', '.jsx', '.ts', '.tsx']`. Modify this array if you’d like to change this. |
| `transformOptions` | `object`   | (optional) See [https://babeljs.io/docs/en/options](https://babeljs.io/docs/en/options)                                                            |
