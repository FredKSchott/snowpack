// test 1: sub-module
import {flatten} from 'array-flatten';
import sort from 'src/sort';
import title from 'public/title';
import concat from './concat';

concat(sort(flatten([1, [2, [3, [4, [5], 6], 7], 8], 9])), [title]);
