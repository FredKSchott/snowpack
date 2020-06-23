// Path aliases
import {flatten} from 'array-flatten';
console.log(flatten);

// Importing a file
import sort from './sort'; // relative import
import sort_ from 'src/sort'; // bare import using mount
import sort__ from 'src/sort.js'; // bare import using mount + extension
console.log(sort, sort_, sort__);

// Importing a directory index.js file
import components from './components'; // relative import 
import components______ from './components/'; // relative import with trailing slash
import components_ from './components/index'; // relative import with index appended
import components__ from './components/index.js'; // relative import with index appended
import components___ from 'src/components'; // bare import using mount
import components____ from 'src/components/index'; // bare import using mount and index appended
import components_____ from 'src/components/index.js'; // bare import using mount and index.js appended
console.log(components, components_, components__, components___, components____, components_____, components______);


// Importing something that isn't JS
import styles from './components/style.css'; // relative import 
import styles_ from 'src/components/style.css'; // relative import 
console.log(styles, styles_);
