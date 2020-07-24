// Path aliases
import {flatten} from '/web_modules/array-flatten.js';
console.log(flatten);

// Importing a file
import sort from './sort.js'; // relative import
import sort_ from '/_dist_/sort.js'; // bare import using mount
import sort__ from '/_dist_/sort.js'; // bare import using mount + extension
console.log(sort, sort_, sort__);

// Importing a directory index.js file
import components from './components/index.js'; // relative import 
import components______ from './components/index.js'; // relative import with trailing slash
import components_ from './components/index.js'; // relative import with index appended
import components__ from './components/index.js'; // relative import with index appended
import components___ from '/_dist_/components/index.js'; // bare import using mount
import components____ from '/_dist_/components/index.js'; // bare import using mount and index appended
import components_____ from '/_dist_/components/index.js'; // bare import using mount and index.js appended
console.log(components, components_, components__, components___, components____, components_____, components______);


// Importing something that isn't JS
import styles from './components/style.css.proxy.js'; // relative import 
import styles_ from '/_dist_/components/style.css.proxy.js'; // relative import 
console.log(styles, styles_);
