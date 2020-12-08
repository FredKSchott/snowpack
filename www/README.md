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

Code blocks should have a top comment with information about the code:
1st line: required if this a code snippet about a specific file
2nd line: describe the change, not always required but recommended. Start with Example: if relevent.
3rd line: if a dependency is implied, add the npm install script here

Example:

```js
// snowpack.config.js
// Example: Connect the Sass plugin
// [npm install @snowpack/plugin-sass]
module.exports = {
  plugins: [
    ['@snowpack/plugin-sass', { /* see options below */ }
  ],
};
```
