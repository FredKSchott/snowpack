## Introduction


The web has evolved over the last decade, but our build tooling hasn't. We're still relying on the old assumption that your application won't run in the browser until you've bundled the whole thing up into larger, shared chunks. That may have been true a few years ago, but ESM `import`/`export` support in the browser changed everything. 

**You no longer need a bundler during development.**

This is great news for developers because it mean that you are no longer *required* to rely on a complex mix of bundler configuration, plugins, dependencies and complexity that you probably wouldn't otherwise need. Bundling is still a great production optimization, but it really has little use during development.   

**Snowpack marks the start of an entirely new generation of bundle-free development tooling.**

### What is Snowpack?

<div class="notification is-link">
  <strong>Snowpack is the bundle-free build tool for React, Vue, Svelte and more.</strong> Snowpack's dev server starts up in &lt;20ms and only builds your site as needed during development. Every code change you make is reflected instantly in the browser thanks to single-file rebuilding.
</div>

Snowpack removes the bundler from your development workflow so that you can build faster with less complexity. Connect your favorite build tools like Babel and PostCSS to customize how your source files are handled with simple, 1-line integrations.

Snowpack also ships with a built-in Parcel integration to help optimize your site for production. Bundling for production with Parcel keeps your site running fast without slowing down your development workflow.

#### Key Takeaways

- Snowpack is a lightning fast dev environment, powered by bundle-free development.
- Simple, 1-line integrations for all of your favorite frameworks and build tools.
- Built-in Parcel support for bundled, production-optimized deployments.


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


### Who Should Use Snowpack?

- **Beginners!** Popular starter applications usually come with 1000's of dependencies and 100's of lines of bundler configuration that you don't actually need. Snowpack simplifies your build and shrinks your configuration needs to zero.
- **Anyone starting a new application!** Snowpack has zero lock-in, so you can always move off of Snowpack and onto a more traditional bundled dev setup down the road (see our guides below). 
- **Anyone building an application that doesn't change often!** Simplified tooling means less time wasated updating breaking changes in your dependencies.
- **Anyone who thinks web development has gotten too complex!** Less tooling means less to install, less complexity, less to do every time you make a change, and less to debug when something goes wrong.
- **Anyone who is interested in the future of web development!** Snowpack is just one step towards a future of web development featuring less complexity and less overhead.


### Supporting Old Browsers

**Snowpack builds sites for both modern and legacy browsers.** The only requirement is that you use a [modern browser](http://caniuse.com/#feat=es6-module) *during development* to reduce the total amount of processing time your site needs on every change. Any recent release of Firefox, Chrome, or Edge will do. 

When you build your site for production, Snowpack will automatically transpile your site to run on older browsers as well. You can control and customize this behavior with the ["browserlist" package.json property.](https://css-tricks.com/browserlist-good-idea/).


### Bundling for Production

**Snowpack gives you the best of both worlds: faster iteration during development + faster loading in production.**

If you want to bundle your site for production, you just use the optimized `--bundle` flag. This improves site performance while also allowing you to target even older, non-ESM browsers like IE11.The do have to pay the price for bundling (ie: longer builds) but only during production builds. Your development workflow stays bundle-free and fast.


