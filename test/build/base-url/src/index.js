// src/index.js - Test import URLs from the "/_dist_/" directory

import {flatten} from 'array-flatten';
import logo from './logo.png';

export default function doNothing() {
  // I do nothing 🎉
}

// Triggers a snowpack meta import URL
console.log(import.meta.env)
// Test import proxies
console.log(logo)