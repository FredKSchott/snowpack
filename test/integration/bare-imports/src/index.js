// Path aliases
import {flatten} from 'array-flatten';
import title from '@title';

// All these imports should be the same
import sort from './sort'; // relative import
import sort_ from 'sort'; // bare import using baseUrl
import sort__ from 'src/sort'; // base import

// All these imports should be the same
import concat from './concat/index'; // relative import
import concat_ from 'concat/index'; // bare import using baseUrl
import concat__ from 'src/concat/index'; // bare import
import concat___ from './concat'; // relative import with index.js appended
import concat____ from 'concat'; // bare import using baseUrl and index.js appended
import concat_____ from 'src/concat'; // bare import with index.js appended

concat(sort(flatten([1, [2, [3, [4, [5], 6], 7], 8], 9])), [title]);
