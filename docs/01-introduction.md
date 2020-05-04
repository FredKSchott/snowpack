## Introduction

Today's web tooling is built on an outdated assumption: that a website can't run in the browser without a bundler. This may have been true in the past, but ESM `import`/`export` support in the browser changed everything. 

**The truth is, you no longer need a bundler during development.**

This is great news for developers because bundlers can easily introduce a mix of configuration, plugins, dependencies and tooling complexity to your workflow that you probably wouldn't otherwise need. Understanding how to configure a bundler shouldn't be a prerequisite for being a great web developer.

Not only that, but bundling during development adds a significant slow down to your dev workflow. When you make changes to a bundled application, you need to wait for the bundler to rebuild an entire chunk of your application just to update your changes to a single file.

**Snowpack marks the start of an entirely new generation of bundle-free development tooling.**

### What is Snowpack?

- <strong>Snowpack is bundle-free build tooling for the next generation of web development.</strong> 
- Snowpack works with React, Vue, Svelte and all of your favorite frameworks and build tools. 
- Snowpack's lightning-fast dev server starts up in &lt;20ms and reflects changes instantly thanks to single-file rebuilding. 
- Snowpack optimizes your site for production thanks to a built-in Parcel integration.

Snowpack removes the bundler from your development workflow so that you can build faster with less complexity. Connect your favorite build tools like Babel and PostCSS to customize how your source files are handled with simple, 1-line build tool integrations.

Snowpack also ships with a built-in Parcel integration to optimize & bundle your site for production. Bundling for production with Parcel keeps your site running fast without slowing down your development workflow.


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

When you build your site for production, Snowpack will automatically transpile your site to run on older browsers as well. You can control and customize this behavior with the ["browserlist" package.json property.](https://css-tricks.com/browserlist-good-idea/).


### Bundling for Production

**Snowpack gives you the best of both worlds: faster bundle-free development + optimized bundling in production.**

If you want to bundle your site for production, you can just use the optimized `--bundle` flag. This improves site performance while also allowing you to target even older, non-ESM browsers like IE11.You still have to pay the price for bundling (ie: longer builds) but only during production builds. Your development workflow stays bundle-free and fast.


