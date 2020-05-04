## Introduction

Web developers are working on an outdated assumption: you can't build a website without a bundler. 

At some point in the last decade, bundling shifted from a production nice-to-have optimization to a full-on dev requirement. Configuration files, plugins, extra dependencies, tooling complexity, code-splitting, waiting around on every save... all of this suddenly became a requirement to build anything on the web.

**Snowpack marks the start of an new generation of build tool that removes the bundler to create a dev environment that is faster, simpler and more powerful than anything else that exists today.**

### What is Snowpack?

- <strong>Snowpack is the fastest way to build & develop web applications.</strong> 
- React, Vue, Svelte, Babel, TypeScript, PostCSS and all of your favorite tools & frameworks are supported with [simple 1-line build integrations.](#build-scripts)
- Snowpack's [dev server](#snowpack-dev) starts up in &lt;20ms and reacts instantly to changes thanks to single-file rebuilding. 
- Snowpack's built-in [Parcel](#snowpack-build---bundle) integration bundles your site for production.


### Who's Using Snowpack?

<div class="company-logos">
{% for user in usersList %}
  <a href="{{ user.url }}" target="_blank">
    {% if user.img %}<img class="company-logo" src="{{ user.img }}" alt="{{ user.name }}" />
    {% else %}<span>{{ user.name }}</span>
    {% endif %}
  </a>
{% endfor %}
<a href="https://github.com/pikapkg/snowpack" target="_blank" title="Star on GitHub!" class="add-star-button" >
  <svg style="height: 20px; margin-right: 8px;" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="star" class="svg-inline--fa fa-star fa-w-18" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"></path></svg>
  Star on GitHub
</a>
<a href="https://github.com/pikapkg/snowpack/edit/master/docs/00.md" target="_blank" title="Add Your Project/Company!" class="add-company-button" >
  <svg style="height: 22px; margin-right: 8px;" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="plus" class="company-logo" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path></svg>
  Add your logo
</a>
</div>



### Supporting Old Browsers

**Snowpack builds sites for both modern and legacy browsers.** The only requirement is that you use a [modern browser](http://caniuse.com/#feat=es6-module) *during development*. Any recent release of Firefox, Chrome, or Edge will do. 

When you build your site for production, Snowpack will automatically transpile your site to run on older browsers as well. You can control and customize this behavior with the ["browserlist" package.json property.](https://css-tricks.com/browserlist-good-idea/)


### Bundling for Production

**Snowpack gives you the best of both worlds: faster bundle-free development + optimized bundling in production.**

If you want to bundle your site for production, use the optimized `--bundle` flag. This improves site performance while also allowing you to target even older, non-ESM browsers like IE11. Pay the price for bundling (ie: a longer build) but only during production deployments. Your development workflow stays fast and bundle-free.


