# @snowpack/plugin-typescript

This plugin adds TypeScript type checking to any Snowpack project. 

When developing or building your site with Snowpack, this plugin will run TypeScript's `tsc` CLI in your project and pipe the output through Snowpack. Works with all version of TypeScript, as long as TypeScript is installed separately in your project.



## Usage

```bash
npm i @snowpack/plugin-typescript typescript
```

Then add the plugin to your Snowpack config:

```js
// snowpack.config.js

module.exports = {
  plugins: [
    '@snowpack/plugin-typescript'
  ],
};
```
