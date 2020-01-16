<p align="center">
  <img alt="Logo" src="https://www.snowpack.dev/img/logo.png" height="240">
</p>

<p align="center">
   <strong>Snowpack</strong><br/> Build web applications with less tooling and 10x faster iteration. No bundler required.
</p>

```bash
npm install --save-dev snowpack
```

1. Instead of bundling on every change, just run Snowpack **once** right after `npm install`.
2. Snowpack re-installs your dependencies as single JS files to a new `web_modules/` directory. **Snowpack never touches your source code.**
3. Build your app, import those dependencies via an ESM `import`, and then run it all in the browser.
4. Skip the bundle step and see your changes reflected in the browser immediately after hitting save.
5. Keep using your favorite web frameworks and build tools! Babel & TypeScript supported.

**💁 More info at the official [Snowpack website ➞](https://snowpack.dev)**

## Examples

> 🆕 Check out **[`snowpack-init`](https://github.com/pikapkg/snowpack-init)**! Instantly bootstrap a starter app with Snowpack + Preact, Lit-HTML, TypeScript, and more.

- A basic, three-dependency project: [[Source]](https://glitch.com/edit/#!/pika-web-example-simple) [[Live Demo]](https://pika-web-example-simple.glitch.me/)
- To-do app with server-side render (Preact + HTM + Express): [[Source]](https://github.com/beejunk/universal-pika-example) [[Live Demo]](https://safe-everglades-56846.herokuapp.com/)
- Terminal Homepage (Preact + Typescript + Babel): [[Source]](https://github.com/ndom91/terminal-homepage) [[Live Demo]](https://termy.netlify.com)
- Electron (using Three.js): [[Source]](https://github.com/br3tt/electron-three)
- TypeScript (using Preact): [[Source]](https://glitch.com/edit/#!/pika-web-ts-preact) [[Live Demo]](https://pika-web-ts-preact.glitch.me/)
- Vue (using httpVueLoader): [[Source]](https://glitch.com/edit/#!/pika-web-vue-httpvueloader) [[Live Demo]](https://pika-web-vue-httpvueloader.glitch.me/) [By: [@thiagoabreu](https://github.com/thiagoabreu)]
- PWA-Starter-Kit (lit-html + Redux): [[Source]](https://github.com/Polymer/pwa-starter-kit/issues/339)
- LitElement + lit-html PWA: [[Source]](https://github.com/thepassle/reddit-pwa) [[Live Demo]](https://angry-turing-4769b3.netlify.com/)
- Hyperapp and JSX (using Babel): [[Source]](https://github.com/Monchi/snowpack-hyperapp) [[Live Demo]](https://snowpack-hyperapp.netlify.com/)
- React PWA Starter (React + Styled components + Workbox): [[Source]](https://github.com/matthoffner/es-react-pwa) [[Live Demo]](https://es-react-pwa.netlify.com/)
- Preact, JSX, Fragment, Router, CSS Grid, Typescript, Babel: [[Source]](https://github.com/crra/snowpack-doodle)
- React, JSX, Material-UI and super basic routing: [[Source]](https://github.com/jmetev1/snowpackJSXreact)
- 🙋‍♀️ Have a great example you'd like to share? Create it on [CodeSandbox](https://codesandbox.io/), [Glitch](https://glitch.com), or [GitHub](https://github.com/new). Then add it here via PR.
