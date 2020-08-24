// Path aliases
import {flatten} from 'array-flatten';
import * as aliasedDep from 'aliased-dep';
console.log(flatten, aliasedDep);

// Importing a file
import sort from './sort'; // relative import
import sort_ from '@app/sort'; // bare import using alias
import sort__ from '@app/sort.js'; // bare import using alias + extension
import sort___ from '@/sort'; // bare import using alias with trailing slash
console.log(sort, sort_, sort__, sort___);

// Importing a directory index.js file
import components from './components'; // relative import
import components______ from './components/'; // relative import with trailing slash
import components_ from './components/index'; // relative import with index appended
import components__ from './components/index.js'; // relative import with index appended
import components___ from '@app/components'; // bare import using alias
import components____ from '@app/components/index'; // bare import using alias and index appended
import components_____ from '@app/components/index.js'; // bare import using alias and index.js appended
import components2 from '%/src/components'; // alias % to '.'
console.log(
  components,
  components_,
  components__,
  components___,
  components____,
  components_____,
  components______,
  components2,
);

// Importing something that isn't JS
import styles from './components/style.css'; // relative import
import styles_ from '@app/components/style.css'; // relative import
console.log(styles, styles_);
