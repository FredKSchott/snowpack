<script>
  import VueRouter from 'vue-router';

  // comments shouldn’t be included
  // import rxjs from 'rjxs';
</script>

<div class="App">
  <!-- test that this comment isn’t imported: -->
  <!-- import React from 'react' -->

  <!-- this also shouldn’t be imported: -->
  <pre><code>import xstate from 'xstate';</code></pre>
</div>