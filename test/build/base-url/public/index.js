// public/index.js - Test import URLs from the "/" directory

import {flatten} from 'array-flatten';

export default function doNothing() {
  // I do nothing 🎉
}

// Triggers a snowpack meta import URL
console.log(import.meta.env);
