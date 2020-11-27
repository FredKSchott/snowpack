---
layout: layouts/content.njk
title: 'Tailwind CSS'
---

[Tailwind](https://tailwindcss.com) is a popular class-based CSS utility library.

### Using Tailwind with Native CSS

The easiest way to use Tailwind is via native CSS `@import` _or_ JS `import`.

```css
/* index.css */
@import 'tailwindcss/dist/tailwind.css';
```

```js
/* index.js */
import 'tailwindcss/dist/tailwind.css';
```

This imports Tailwind's full CSS build into your application. This simple usage comes at the cost of performance: Tailwind's full CSS build is 3.5+ MB of CSS. For any serious production use, the Tailwind team **strongly** recommends using PostCSS.

#### Using Tailwind with PostCSS

If you are using PostCSS in your project then you can add Tailwind as a plugin to your `postcss.config.js`:

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
- @import 'tailwindcss/dist/tailwind.css';
+ @import 'tailwindcss/base';
+ @import 'tailwindcss/components';
+ @import 'tailwindcss/utilities';
```

Follow the official [Tailwind CSS Docs](https://tailwindcss.com/docs/installation/#using-tailwind-with-postcss) for more information.
