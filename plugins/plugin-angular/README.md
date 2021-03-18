# @snowpack/plugin-angular

When developing or building your site with Snowpack, this plugin will run Angular's [`compiler-cli`](https://angular.io/guide/aot-compiler) in your project and pipe the output through Snowpack.

## Usage

```bash
npm i --save-dev @snowpack/plugin-angular
```

Then add the plugin to your Snowpack config:

```js
// snowpack.config.js

module.exports = {
	plugins: ['@snowpack/plugin-angular'],
};
```

## Plugin Options

| Name   |   Type   | Description                                                                                                                                                                               |
| :----- | :------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `args` | `string` | Optional arguments to pass to the `ngc` CLI. For example, you can configure a custom project directory (with a custom `tsconfig.json` file) using `args: "--project ./your/custom/path"`. |
