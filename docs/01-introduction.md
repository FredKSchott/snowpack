## Introduction

Web developers are relying on an outdated assumption: you can't build websites without a bundler. 

At some point in the last decade, JavaScript bundling shifted from being a production nice-to-have optimization to a full-on dev requirement. Configuration files, plugin ecosystems, extra dependencies, tooling complexity, code-splitting, waiting to rebundle every save... all of this suddenly became required overhead to do any level of web development.

**Snowpack marks the start of a new generation of no-bundle dev tooling.** Snowpack installs your npm dependencies so that they can run directly in the browser (via native ESM `import`) and then provides additional dev + build tooling to run your entire application.

### Key Highlights

- **No More Bundling During Development:** Snowpack installs your npm dependencies so that they can be imported directly in the browser without an application bundler.
- **Instant Dev Startup:** Snowpack's dev server starts up in less than 20ms on most machines. Files are only built on-demand, as requested by the browser.
- **Instant Dev Rebuilding:** Never wait more than a few milliseconds when you hit save. Since there's no large app chunks to rebuild, changes are reflected in the browser instantly.
- **Connect your Favorite Build Tools:**  Manage your build using a simple, familiar ["scripts" interface](#build-scripts) that replaces traditionally complex plugin ecosystems.
- **Bundle for Production:** It's the best of both worlds: fast bundle-free development + optimized bundling in production. Choose between bundled (optimized) or unbundled build output without any additional config needed.

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

**Snowpack builds your site for both modern and legacy browsers.** The only requirement is that  *during development* you use a [modern browser](http://caniuse.com/#feat=es6-module). Any recent release of Firefox, Chrome, or Edge will do. 

When you build your site for production, Snowpack will automatically transpile your site to run on older browsers as well. You can control and customize this behavior with the ["browserlist" package.json property.](https://css-tricks.com/browserlist-good-idea/). As long as you use the `--bundle` optimization flag, your site will even run on ancient non-ESM browsers like IE11.
