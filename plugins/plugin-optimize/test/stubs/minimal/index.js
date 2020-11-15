import esm_example from './esm_example.js';
import supportTarget from './target-es2018.js';
import('./do-not-preload-3.js');

(() => {
  function n(o) {
    console.log(o);
  }
  n('test', supportTarget());
})();
