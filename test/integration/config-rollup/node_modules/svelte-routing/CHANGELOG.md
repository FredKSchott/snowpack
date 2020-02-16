# 1.4.0

Added functionality for passing the `location` to the rendered Route `component` and slot.

```html
<!-- App.svelte -->
<Route path="blog" component="{Blog}" />

<!-- Blog.svelte -->
<script>
  import queryString from "query-string";

  export let location;

  let queryParams;
  $: queryParams = queryString.parse(location.search);
</script>

<h1>Blog</h1>
<p>{queryParams.foo}</p>

<!-- App.svelte -->
<Route path="blog" let:location>
  <h1>Blog</h1>
  <p>{location.search}</p>
</Route>
```

# 1.3.0

Added functionality to pass potential `Route` path parameters back to the parent using props, so they can be exposed to the slot template using `let:params`.

```html
<Route path="blog/:id" let:params>
  <BlogPost id="{params.id}" />
</Route>
```

# 1.2.0

Added functionality for passing all the extra `Route` properties to the rendered `component`.

```html
<!-- App.svelte -->
<Route path="page" component={Page} foo="foo" bar="bar" />

<!-- Page.svelte -->
<script>
  export let foo;
  export let bar;
</script>

<h1>{foo} {bar}</h1>
```

# 1.1.0

Added the ability to give `Route` path wildcards a custom name.

```html
<!-- App.svelte -->
<Route path="page/*wildcardName" component={Page} />

<!-- Page.svelte -->
<script>
  export let wildcardName;
</script>

<h1>{wildcardName}</h1>
```

# 1.0.0

- Moved to Svelte 3.
- It's now required for all `Route` and `Link` components to have a `Router` ancestor.
- `NavLink` was removed in favour for a more versatile `Link` component. Check the userland `NavLink` component in the `example` directory for an example.
- The SSR component no longer needs to be compiled at runtime with the help of [esm](https://github.com/standard-things/esm) as there is no longer a dependency on the `history` library. You can compile a separate CJS bundle for the server and pass in a prop to the topmost component and use that as the `url` property for the `Router`, which will force the URL for all descendants.
- All component filename extensions have been changed to `.svelte`.
- Hash routing is no longer supported.
- The entire API of the library is now exported from the `src/index.js` file, so importing from the library is now much more pleasant.

```javascript
import { Router, Route, Link } from "svelte-routing";
```

# 0.4.0

Moved to Svelte v2 and added the new [link](https://github.com/EmilTholin/svelte-routing#linkjs) and [links](https://github.com/EmilTholin/svelte-routing#linksjs) actions.

# 0.3.0

Split the `createHistory` function into `createBrowserHistory`, `createMemoryHistory`, `createHashHistory` to allow for better tree shaking of unused history creation code.

# 0.2.0

Added the ability to access the match object in a matched route:

```html
<!-- App.html -->
<Route path="/:myParam" bind:match>
  <h1>{{match && match.params.myParam}}</h1>
</Route>
```

or:

```html
<!-- App.html -->
<Route path="/:myParam" component="{{MyComponent}}" />

<!-- MyComponent.html -->
<h1>{{match.params.myParam}}</h1>
```

# 0.1.0

Added the ability to give a component constructor to a route with the `component` property:

```html
<!-- App.html -->
<Route path="/:myParam" component="{{MyComponent}}" />
```
