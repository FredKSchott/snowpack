import {
  SvelteComponentDev,
  create_component,
  destroy_component,
  detach_dev,
  dispatch_dev,
  init,
  insert_dev,
  mount_component,
  noop,
  safe_not_equal,
  space,
  transition_in,
  transition_out,
} from 'svelte/internal';
// this exports *.svelte files, and needs rollup-plugin-svelte
import {Router, Route} from 'svelte-routing';
