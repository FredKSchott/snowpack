#### Who's Using Snowpack?

<div class="company-logos">
{% for user in usersList %}
  <a href="{{ user.url }}" target="_blank">
    {% if user.img %}<img class="company-logo" src="{{ user.img }}" alt="{{ user.name }}" />
    {% else %}<span>{{ user.name }}</span>
    {% endif %}
  </a>
{% endfor %}
<a href="https://github.com/pikapkg/snowpack/edit/master/docs/00.md" target="_blank" title="Add Your Project/Company!" class="add-company-button" >
  <svg style="height: 22px; margin-right: 8px;" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="plus" class="company-logo" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path></svg>
  Add your logo
</a>
</div>

## Overview

### What is Snowpack?

**Snowpack is a faster build tool for modern web apps.** Snowpack leverages [ESM imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) in your application to remove unnecessary bundling work during development. The end result is a build tool that starts up instantly and wastes no time rebuilding on every change. See changes reflected in the browser instantly.

[Check out our launch post](/posts/2020-05-26-snowpack-2-0-release/) to learn more.


### Key Features

- A dev environment that starts up in **50ms or less.**
- Changed files are rebuilt [instantly.](/#hot-module-replacement) 
- Integrates with your favorite bundler for [production builds](/#snowpack-build).
- Out-of-the-box support for [TypeScript, JSX, CSS Modules and more.](/#features)
- [Custom build scripts](/#build-scripts) & [third-party plugins](/#build-plugins) to connect your favorite tools.

### Library Support

<div class="grid-list">

- React
- Preact
- Svelte
- Vue
- lit-html
- lit-element
- Styled Components
- Tailwind CSS
- and more!

</div>

### Tooling Support

<div class="grid-list">

- Babel
- TypeScript
- PostCSS
- SASS
- esbuild
- 11ty
- and more!

</div>

### Browser Support

**Snowpack builds your site for both modern and legacy browsers (even IE11).** You can control and customize this behavior with the ["browserlist" package.json property](https://css-tricks.com/browserlist-good-idea/). 

The only requirement is that *during development* you use a [modern browser](http://caniuse.com/#feat=es6-module). Any recent release of Firefox, Chrome, or Edge will do. This is required to support the modern, bundle-free ESM imports that load your application in the browser.
