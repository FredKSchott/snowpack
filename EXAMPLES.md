# @pika/web Examples

> 🙋‍♀️ Have a great example you'd like to share? Create it on [CodeSandbox](https://codesandbox.io/), [Glitch](https://glitch.com), or [GitHub](https://github.com/new). Then [add it here!](https://github.com/pikapkg/web/edit/master/EXAMPLES.md)
> 🙋‍♂️ Have a idea for an example that's not shown here? Add it to the ["Call for Examples"](#call-for-examples-cfe) section below.

## List of Examples

- A basic, three-dependency @pika/web project: [[Source]](https://glitch.com/edit/#!/pika-web-example-simple) [[Live Demo]](https://pika-web-example-simple.glitch.me/)
- Preact + HTM: [[Source]](https://glitch.com/edit/#!/pika-web-example-preact-htm) [[Live Demo]](https://pika-web-example-preact-htm.glitch.me)
- Electron (using Three.js): [[Source]](https://github.com/br3tt/electron-three)
- TypeScript (using Preact): [[Source]](https://glitch.com/edit/#!/pika-web-ts-preact) [[Live Demo]](https://pika-web-ts-preact.glitch.me/)
- Vue (using httpVueLoader): [[Source]](https://glitch.com/edit/#!/pika-web-vue-httpvueloader) [[Live Demo]](https://pika-web-vue-httpvueloader.glitch.me/) [By: [@thiagoabreu](https://github.com/thiagoabreu)]

## A Note on React

React is [not yet published with ES Module support](https://github.com/facebook/react/issues/11503). **However**, it is still possible to use with @pika/web thanks to @sdegutis's [@reactesm](https://www.npmjs.com/org/reactesm) project & npm/yarn's alias feature:

```
npm install react@npm:@reactesm/react react-dom@npm:@reactesm/react-dom
yarn add react@npm:@reactesm/react react-dom@npm:@reactesm/react-dom
```

This command installs ESM versions of the latest react & react-dom into your `node_modules/` directory, which @pika/web will then use when it installs your web_modules directory. This works with [any ESM-compatible React libraries](https://www.pika.dev/search?q=react-) as well!

```js
import React, { useState } from './web_modules/react.js';
```

## A Note on JSX

Remember that JSX is non-standard, and won't run in any browser. To use JSX with @pika/web:

1. Use Babel to build your `src/` directory to an output `lib/` directory, and load that in the browser.
1. Use a JSX-like library like Jason Miller's [htm](https://github.com/developit/htm).


## Call for Examples (CFE)

- Ionic 4 basic application [[Discussion]](https://github.com/pikapkg/web/pull/28)
- React + Styled Components [[Discussion]](https://github.com/pikapkg/web/issues/66)
- [Add examples that you'd like to see here!](https://github.com/pikapkg/web/edit/master/EXAMPLES.md)
