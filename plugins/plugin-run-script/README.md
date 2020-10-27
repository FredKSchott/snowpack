# @snowpack/plugin-run-script

Run any CLI command as a part of Snowpack’s dev server and production build. Useful for languages not supported by [Snowpack plugins](https://www.snowpack.dev/#build-plugins). This replaces the old `run:*` scripts in your Snowpack config.

Usage:

```bash
npm i @snowpack/plugin-run-script
```

Then add the plugin to your Snowpack config:

```js
// snowpack.config.js

module.exports = {
  plugins: [
    [
      '@snowpack/plugin-run-script',
      {
        cmd: 'sass src/css:public/css --no-source-map', // production build command
        watch: 'sass --watch src/css:public/css --no-source-map', // (optional) dev server command
      },
    ],
  ],
};
```

Supply any CLI command in `cmd`. Note that this is the same as running the command yourself in your project root folder (i.e. you can reference any global packages as well as npm script).

## Plugin Options

| Name     |   Type    | Description                                                                 |
| :------- | :-------: | :-------------------------------------------------------------------------- |
| `cmd`    | `string`  | The CLI command to run. Note that this will run **before** Snowpack builds. |
| `name`   | `string`  | (optional) Set name of console output, default is program name.             |
| `watch`  | `string`  | (optional) A watch command to run during the dev server.                    |
| `output` | `"stream" | "dashboard"`                                                                | (optional) Set how the output should be recorded during dev. |
