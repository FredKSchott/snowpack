# @snowpack/plugin-dotenv

Use [dotenv](https://github.com/motdotla/dotenv) to load environment variables from your project `.env` files. See Snowpack's [Environment Variables](https://www.snowpack.dev/reference/environment-variables) documentation to learn more.

```
npm install --save-dev @snowpack/plugin-dotenv
```

```js
// snowpack.config.json
{
  "plugins": ["@snowpack/plugin-dotenv"]
}
```

```
# .env
SNOWPACK_PUBLIC_ENABLE_FEATURE=true
```

**NOTE:** Snowpack requires the `SNOWPACK_PUBLIC_` prefix to recognize environment variables. This is to prevent accidental exposure of keys and secrets.

#### What is Supported?

- [dotenv-expand](https://github.com/motdotla/dotenv-expand)
- `.env.NODE_ENV.local`
- `.env.NODE_ENV`
- `.env`

#### Plugin Options

| Name  | Type     | Description                                                                                        |
| :---- | :------- | :------------------------------------------------------------------------------------------------- |
| `dir` | `string` | (optional) Where to find `.env` files. Default is your current working directory (`process.cwd()`) |
