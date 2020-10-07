# @snowpack/plugin-markdown

Use [markdown-wasm](https://github.com/rsms/markdown-wasm) to transform Markdown files into HTML pages.

```
npm install --save-dev @snowpack/plugin-markdown
```

```js
// snowpack.config.json
{
  "plugins": ["@snowpack/plugin-markdown"]
}
```

#### What is Supported?

WIP

#### Plugin Options

Any of the options in [markdown-wasm](https://github.com/rsms/markdown-wasm)'s API are available. For example:

```js
{
  "plugins": ["@snowpack/plugin-markdown", { parseFlags: markdown.ParseFlags.DEFAULT | markdown.ParseFlags.NO_HTML }]
}
```
