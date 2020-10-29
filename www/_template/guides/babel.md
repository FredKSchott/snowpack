---
layout: layouts/guide.njk
---

### Babel

Snowpack already comes with built-in support for building JavaScript, TypeScript, and JSX. However, If you would like to run your build through Babel instead, you can replace our default file builder with the official Snowpack Babel plugin.

The plugin will automatically read plugins & presets from your local project `babel.config.*` config file, if one exists.

```js
// snowpack.config.json
"plugins": ["@snowpack/plugin-babel"],
```
