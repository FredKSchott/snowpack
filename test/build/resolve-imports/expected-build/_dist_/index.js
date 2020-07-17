// Path aliases
import {flatten} from '/web_modules/array-flatten.js';
import * as aliasedDep from 'array-flatten.js';
console.log(flatten, aliasedDep);

// Importing a file
import sort from './sort.js'; // relative import
import sort_ from '/Users/fks/Code/snowpack/snowpack/test/build/resolve-imports/src/sort.js'; // bare import using alias
import sort__ from '/Users/fks/Code/snowpack/snowpack/test/build/resolve-imports/src/sort.js'; // bare import using alias + extension
console.log(sort, sort_, sort__);

// Importing a directory index.js file
import components from './components/index.js'; // relative import 
import components______ from './components/index.js'; // relative import with trailing slash
import components_ from './components/index.js'; // relative import with index appended
import components__ from './components/index.js'; // relative import with index appended
import components___ from '/Users/fks/Code/snowpack/snowpack/test/build/resolve-imports/src/components.js'; // bare import using alias
import components____ from '/Users/fks/Code/snowpack/snowpack/test/build/resolve-imports/src/components/index.js'; // bare import using alias and index appended
import components_____ from '/Users/fks/Code/snowpack/snowpack/test/build/resolve-imports/src/components/index.js'; // bare import using alias and index.js appended
console.log(components, components_, components__, components___, components____, components_____, components______);


// Importing something that isn't JS
import styles from './components/style.css.proxy.js'; // relative import 
import styles_ from '/Users/fks/Code/snowpack/snowpack/test/build/resolve-imports/src/components/style.css.proxy.js'; // relative import 
console.log(styles, styles_);
