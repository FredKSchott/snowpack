---
layout: layouts/guide.njk
---

### ESLint

```js
// snowpack.config.json
"plugins": [
  ["@snowpack/plugin-run-script", {
    "cmd": "eslint 'src/**/*.{js,jsx,ts,tsx}'",
    // Optional: Use npm package "watch" to run on every file change
    "watch": "watch \"$1\" src"
  }]
]
```
