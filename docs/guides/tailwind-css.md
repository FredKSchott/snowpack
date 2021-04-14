---
layout: layouts/content.njk
title: 'Tailwind CSS'
tags: communityGuide
published: true
img: '/img/logos/tailwind.svg'
imgBackground: '#f2f8f8'
description: How to use Tailwind CSS with Snowpack.
---

[Tailwind](https://tailwindcss.com) is a popular class-based CSS utility library. Loading it in Snowpack is easy, and only requires a few steps!

## Setup

Tailwind’s [JIT mode][tailwind-jit] is the new, recommended way to use Tailwind. To set this up in a Snowpack project, do the following:

#### 1. Install dependencies

From the root of your project, install tailwindcss, PostCSS, and the Snowpack PostCSS plugin.

```
npm install --save-dev tailwindcss @snowpack/plugin-postcss postcss postcss-cli
```

#### 2. Configure

You’ll need to create two files in the root of your project: `postcss.config.js` and `tailwind.config.js`:

```js
// postcss.config.js

module.exports = {
  plugins: {
    tailwindcss: {},
    // other plugins can go here, such as autoprefixer
  },
};
```

```js
// tailwind.config.js

module.exports = {
  mode: 'jit',
  purge: ['./public/**/*.html', './src/**/*.{js,jsx,ts,tsx,vue}'],
  // specify other options here
};
```

_Note: be sure to set `purge: []` correctly for your project structure_

Also, you’ll need to add the Snowpack PostCSS plugin to your Snowpack config, if you haven‘t already:

```diff
  // snowpack.config.js

  module.exports = {
    mount: {
      src: '/_dist',
      public: '/',
    },
+   plugins: [
+     '@snowpack/plugin-postcss',
+   ],
  };
```

#### 3. Import Tailwind in your CSS

From any global CSS file, add the [Tailwind utilites][tailwind-utilities] you need (if you don’t have a global CSS file, we recommend creating one at `/public/global.css`):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

When you load these with Snowpack, you should see these replaced with Tailwind CSS instead.

⚠️ Make sure you’re importing this file in your main HTML file, like so:

```diff
  <head>
+   <link rel="stylesheet" type="text/css" href="/global.css" />
  </head>
```

## More reading

- [Official Tailwind Documentation][tailwind-postcss]
- [PostCSS + Snowpack][snowpack-postcss]

[snowpack-postcss]: /guides/postcss/
[tailwind-jit]: https://tailwindcss.com/docs/just-in-time-mode
[tailwind-postcss]: https://tailwindcss.com/docs/installation/#using-tailwind-with-postcss
[tailwind-utilities]: https://tailwindcss.com/docs/adding-new-utilities#using-css
