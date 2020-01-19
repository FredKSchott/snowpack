// test 1: should properly scan a specifier containing "?v=..." querystring
import {flatten} from '/web_modules/array-flatten.js?v=1.2.3';
flatten([1, [2, [3, [4, [5], 6], 7], 8], 9]);
