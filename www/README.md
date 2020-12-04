# Snowpack Docs

We aim to follow the [Divio documentation system](https://documentation.divio.com/introduction/) though a lot of our docs are legacy and don't necessarily fit it yet.

## Architecture

- Markdown files that become pages are in `/template`
- SASS files in `css`
- templates in `_includes`

## Style Guide
- Terminology
  - When do we use Snowpack app vs. project vs. site vs. webapp
- Sentence-style capitalization
- Oxford comma
- Don't capitalize after colons
- Avoid using future tense and passive tense if possible, for example "will rebuild" should be "rebuilds"

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
