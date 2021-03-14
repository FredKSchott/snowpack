// src/index.js - Test import URLs from the "/_dist_/" directory

import {flatten} from 'https://www.example.com/web_modules/array-flatten.js';

export default function doNothing() {
  // I do nothing 🎉
}

// Triggers a snowpack meta import URL
console.log(import.meta.env);
