# Snowpack docs

We aim to follow the [Divio documentation system](https://documentation.divio.com/introduction/) though a lot of our docs are legacy and don't necessarily fit it yet.

## Architecture

- Markdown files that become pages are in `/template`
- SASS files in `css`
- templates in `_includes`

## Style guide
- Terminology
  - Use "Snowpack project" rather than Snowpack app/webapp or Snowpack site in docs
  - Exceptions are in blog posts or introductory material where the other terms are easier to understand
- Sentence-style capitalization
- Oxford comma
- Capitalize after colons
- Avoid using vague terms for link text like "here"

### Code blocks

Code blocks should include a file name on the top in a comment. Example:

```js
// snowpack.config.js

module.exports = {
  plugins: [
    ['@snowpack/plugin-sass', { /* see options below */ }
  ],
};
```

The second line should ideally include a description of the example
```js
// snowpack.config.js
// Example: enabling the sass plugin after installing it `npm install --save-dev @snowpack/plugin-sass`
module.exports = {
  plugins: [
    ['@snowpack/plugin-sass', { /* see options below */ }
  ],
};
```
