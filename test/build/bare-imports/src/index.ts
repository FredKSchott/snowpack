// Path aliases
import {flatten} from 'array-flatten';
import title from 'components/Button';
console.log(flatten, title);

// Importing a file
import sort from './sort'; // relative import
import sort_ from 'sort'; // bare import using baseUrl
import sort__ from 'sort.js'; // bare import using baseUrl + file extension
console.log(sort, sort_, sort__);

// Importing a directory index.js file
import concat___ from './concat'; // relative import 
import concat____ from 'concat'; // bare import using baseUrl
import concat from './concat/index'; // relative import with index.js appended
import concat_ from 'concat/index'; // bare import using baseUrl and index.js appended
import concat__ from 'concat/index.js'; // bare import using baseUrl and index.js appended
console.log(concat, concat_, concat__, concat___, concat____);