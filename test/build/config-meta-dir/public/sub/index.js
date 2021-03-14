// public/sub/index.js - Test import URLs from the "/sub/" directory
export default function doNothing() {
  // I do nothing 🎉
}

// Triggers a snowpack meta import URL
console.log(import.meta.env);
