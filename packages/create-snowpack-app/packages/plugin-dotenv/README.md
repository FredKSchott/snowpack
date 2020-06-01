# @snowpack/plugin-dotenv

Use [dotenv](https://github.com/motdotla/dotenv) to load environment variables from your project `.env` files. See Snowpack's [Environment Variables](https://www.snowpack.dev/#environment-variables) documentation to learn more.

```
npm install --save-dev @snowpack/plugin-dotenv
```

```js
// snowpack.config.json
{
  "plugins": ["@snowpack/plugin-dotenv"]
}
```

#### What is Supported?

- [dotenv-expand](https://github.com/motdotla/dotenv-expand)
- `.env.NODE_ENV.local`
- `.env.NODE_ENV`
- `.env`

#### Plugin Options

None
