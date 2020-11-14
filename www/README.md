# Snowpack Docs

## Architecture

- Markdown files that become pages are in `/template`
- SASS files in `css`
- templates in `_includes`

## Style Guide

### Code Blocks

Code blocks should include a file name on the top in a comment. Example:

```js
// snowpack.config.js

module.exports = {
  plugins: [
    ['@snowpack/plugin-sass', { /* see options below */ }
  ],
};
```
