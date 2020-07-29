#### Who's Using Snowpack?

<div class="company-logos">
{% for user in usersList %}
  <a href="{{ user.url }}" target="_blank">
    {% if user.img %}<img class="company-logo" src="{{ user.img }}" alt="{{ user.name }}" />
    {% else %}<span>{{ user.name }}</span>
    {% endif %}
  </a>
{% endfor %}
<a href="https://github.com/pikapkg/snowpack/edit/master/docs/docs/00.md" target="_blank" title="Add Your Project/Company!" class="add-company-button" >
  <svg style="height: 22px; margin-right: 8px;" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="plus" class="company-logo" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path></svg>
  Add your logo
</a>
</div>

## Overview

### What is Snowpack?

**Snowpack is a modern, lightweight toolchain for faster web development.** Traditional JavaScript build tools like webpack and Parcel need to rebuild & rebundle entire chunks of your application every time you save a single file. This rebundling step introduces lag between hitting save on your changes and seeing them reflected in the browser.

Snowpack solves this problem by serving your website **unbundled** during development. Every file in your application is only built once, and then cached forever. When you change a file, Snowpack only needs to rebuild that single file. There's no time wasted re-bundling every change, just instant updates in the browser (made even faster via Hot-Module Replacement). You can read more about this new approach to web development in our [Snowpack 2.0 Release Post.](/posts/2020-05-26-snowpack-2-0-release/) 

Snowpack's **unbundled development** approach still supports the same **bundled production builds** that you're used to. When you go to build your application for production, you can plug in your favorite bundler via an official Snowpack plugin for Webpack or Rollup (coming soon). With Snowpack already handling your build, there's no complex bundler config required.

**Snowpack gets you the best of both worlds:** fast, unbundled development with optimized performance in your bundled production builds.

### Key Features

- A frontend dev environment that starts up in **50ms or less.** 
- Changes reflected [instantly in the browser.](/#hot-module-replacement)
- Integrates your favorite bundler for [production-optimized builds.](/#snowpack-build)
- Out-of-the-box support for [TypeScript, JSX, CSS Modules and more.](/#features)
- Connect your favorite tools with [third-party plugins.](/#build-plugins)

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
<!-- Missing something? Feel free to add your own! -->

</div>

### Tooling Support

<div class="grid-list">

- Babel
- TypeScript
- PostCSS
- Sass
- esbuild
- 11ty
- and more!
<!-- Missing something? Feel free to add your own! -->

</div>

### Browser Support

**Snowpack builds your site for both modern and legacy browsers. Even IE11 is supported.** You can control and customize this behavior with the ["browserlist" package.json property](https://css-tricks.com/browserlist-good-idea/). 

The only requirement is that *during development* you use a [modern browser](http://caniuse.com/#feat=es6-module). Any recent release of Firefox, Chrome, or Edge will do. This is required to support the modern, bundle-free ESM imports that load your application in the browser.
