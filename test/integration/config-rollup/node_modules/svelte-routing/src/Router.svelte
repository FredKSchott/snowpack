<script>
  import { getContext, setContext, onMount } from "svelte";
  import { writable, derived } from "svelte/store";
  import { LOCATION, ROUTER } from "./contexts.js";
  import { globalHistory } from "./history.js";
  import { pick, match, stripSlashes, combinePaths } from "./utils.js";

  export let basepath = "/";
  export let url = null;

  const locationContext = getContext(LOCATION);
  const routerContext = getContext(ROUTER);

  const routes = writable([]);
  const activeRoute = writable(null);
  let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

  // If locationContext is not set, this is the topmost Router in the tree.
  // If the `url` prop is given we force the location to it.
  const location =
    locationContext ||
    writable(url ? { pathname: url } : globalHistory.location);

  // If routerContext is set, the routerBase of the parent Router
  // will be the base for this Router's descendants.
  // If routerContext is not set, the path and resolved uri will both
  // have the value of the basepath prop.
  const base = routerContext
    ? routerContext.routerBase
    : writable({
        path: basepath,
        uri: basepath
      });

  const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
    // If there is no activeRoute, the routerBase will be identical to the base.
    if (activeRoute === null) {
      return base;
    }

    const { path: basepath } = base;
    const { route, uri } = activeRoute;
    // Remove the potential /* or /*splatname from
    // the end of the child Routes relative paths.
    const path = route.default ? basepath : route.path.replace(/\*.*$/, "");

    return { path, uri };
  });

  function registerRoute(route) {
    const { path: basepath } = $base;
    let { path } = route;

    // We store the original path in the _path property so we can reuse
    // it when the basepath changes. The only thing that matters is that
    // the route reference is intact, so mutation is fine.
    route._path = path;
    route.path = combinePaths(basepath, path);

    if (typeof window === "undefined") {
      // In SSR we should set the activeRoute immediately if it is a match.
      // If there are more Routes being registered after a match is found,
      // we just skip them.
      if (hasActiveRoute) {
        return;
      }

      const matchingRoute = match(route, $location.pathname);
      if (matchingRoute) {
        activeRoute.set(matchingRoute);
        hasActiveRoute = true;
      }
    } else {
      routes.update(rs => {
        rs.push(route);
        return rs;
      });
    }
  }

  function unregisterRoute(route) {
    routes.update(rs => {
      const index = rs.indexOf(route);
      rs.splice(index, 1);
      return rs;
    });
  }

  // This reactive statement will update all the Routes' path when
  // the basepath changes.
  $: {
    const { path: basepath } = $base;
    routes.update(rs => {
      rs.forEach(r => (r.path = combinePaths(basepath, r._path)));
      return rs;
    });
  }
  // This reactive statement will be run when the Router is created
  // when there are no Routes and then again the following tick, so it
  // will not find an active Route in SSR and in the browser it will only
  // pick an active Route after all Routes have been registered.
  $: {
    const bestMatch = pick($routes, $location.pathname);
    activeRoute.set(bestMatch);
  }

  if (!locationContext) {
    // The topmost Router in the tree is responsible for updating
    // the location store and supplying it through context.
    onMount(() => {
      const unlisten = globalHistory.listen(history => {
        location.set(history.location);
      });

      return unlisten;
    });

    setContext(LOCATION, location);
  }

  setContext(ROUTER, {
    activeRoute,
    base,
    routerBase,
    registerRoute,
    unregisterRoute
  });
</script>

<slot></slot>
