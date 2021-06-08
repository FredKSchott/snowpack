export default {
  projectRoot: '.',
  pages: './src/pages',
  dist: './dist',
  public: './public',
  renderers: [
    // When testing, we used this as a bit of a kitchen sink for Astro.
    // Keep the different mixing of frameworks just for fun, to show Astro off.
    '@astrojs/renderer-vue',
    '@astrojs/renderer-svelte',
    '@astrojs/renderer-preact'
  ]
};
