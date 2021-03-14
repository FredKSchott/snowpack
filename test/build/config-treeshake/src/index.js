// Test: complex comments intermixed with imports
import def, {
  waterfall,
  /* map, */
  all /* , */,
} from 'async';
console.log(def, waterfall, all);

import(/* webpackChunkName: "array-flatten" */ 'array-flatten');
