<script>
  import { getContext, onDestroy } from "svelte";
  import { ROUTER, LOCATION } from "./contexts.js";

  export let path = "";
  export let component = null;

  const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
  const location = getContext(LOCATION);

  const route = {
    path,
    // If no path prop is given, this Route will act as the default Route
    // that is rendered if no other Route in the Router is a match.
    default: path === ""
  };
  let routeParams = {};
  let routeProps = {};

  $: if ($activeRoute && $activeRoute.route === route) {
    routeParams = $activeRoute.params;
  }

  $: {
    const { path, component, ...rest } = $$props;
    routeProps = rest;
  }

  registerRoute(route);

  // There is no need to unregister Routes in SSR since it will all be
  // thrown away anyway.
  if (typeof window !== "undefined") {
    onDestroy(() => {
      unregisterRoute(route);
    });
  }
</script>

{#if $activeRoute !== null && $activeRoute.route === route}
  {#if component !== null}
    <svelte:component this="{component}" location={$location} {...routeParams} {...routeProps}  />
  {:else}
    <slot params="{routeParams}" location={$location}></slot>
  {/if}
{/if}
