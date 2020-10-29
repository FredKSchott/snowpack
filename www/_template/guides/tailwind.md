---
layout: layouts/main.njk
title: Tailwind
tags: guides
---

## Tailwind CSS

You can add [Tailwind](https://tailwindcss.com) to any project via native CSS `@import`:

```css
/* index.css */
@import 'tailwindcss/dist/base.css';
@import 'tailwindcss/dist/components.css';
@import 'tailwindcss/dist/utilities.css';
```

### Using Tailwind with PostCSS

If you are using PostCSS in your project ([see above](#postcss)) then you can just add Tailwind as a plugin to your `postcss.config.js`:

```js
// postcss.config.js
// Taken from: https://tailwindcss.com/docs/installation#using-tailwind-with-postcss
module.exports = {
  plugins: [
    // ...
    require('tailwindcss'),
    require('autoprefixer'),
    // ...
  ],
};
```

Once you have added the Tailwind PostCSS plugin, you can replace your native CSS `dist` imports with Tailwind's more powerful `base`, `components`, and `utilities` imports:

```diff
/* index.css */
- @import 'tailwindcss/dist/base.css';
- @import 'tailwindcss/dist/components.css';
- @import 'tailwindcss/dist/utilities.css';
+ @import 'tailwindcss/base';
+ @import 'tailwindcss/components';
+ @import 'tailwindcss/utilities';
```

Follow the official [Tailwind CSS Docs](https://tailwindcss.com/docs/installation/#using-tailwind-with-postcss) for more information.
