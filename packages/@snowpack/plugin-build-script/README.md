# @snowpack/plugin-build-script

A Snowpack plugin to build files in your application using any CLI tool. This plugin passes matching files as input to a custom CLI command and returns the output response as the build result. This is useful for connecting a custom CLI or when no Snowpack plugin exists for a favorite build tool.

Note: All Snowpack < v2.6 `build:*` scripts now use this plugin behind the scenes.

Usage:

```bash
npm install @snowpack/plugin-build-script
```

Then add the plugin to your Snowpack config:

```js
// snowpack.config.js

module.exports = {
  plugins: [
    [
      '@snowpack/plugin-build-script',
      {
        input: ['.tsx'], // files to watch
        output: ['.tsx'], // files to export
        cmd: 'babel --filename $FILE', // cmd to run
      },
    ],
  ],
};
```

## Plugin Options

| Name     |    Type    | Description                                                                 |
| :------- | :--------: | :-------------------------------------------------------------------------- |
| `input`  | `string[]` | Array of extensions to watch for.                                           |
| `output` | `string[]` | Array of extensions this plugin will output.                                |
| `cmd`    |  `string`  | Command to run on every file matching `input`. Accepts the `$FILE` env var. |
