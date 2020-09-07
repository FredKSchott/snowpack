import 'tippy.js/dist/tippy.css';
import tippy from 'tippy.js';
import * as tippyJs from 'tippy.js/headless/dist/tippy-headless.esm.js';

console.log(tippyJs);

tippy('#myButton', {
  content: "I'm a Tippy tooltip!",
});
