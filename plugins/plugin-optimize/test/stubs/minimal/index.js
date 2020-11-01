import esm_example from './esm_example.js';
import('./do-not-preload-3.js');

(() => {
  function n(o) {
    console.log(o);
  }
  n('test');
})();
