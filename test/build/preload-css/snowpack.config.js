module.exports = {
  mount: {
    public: '/',
    src: '/_dist_',
  },
  plugins: [
    '@snowpack/plugin-sass',
    [
      '@snowpack/plugin-optimize',
      {
        minifyCSS: true, // easy fix for Windows snapshot bug (CSS is minimal enough to read w/ minification)
        minifyHTML: false, // makes diffs easier to compare
        minifyJS: false,
        preloadCSS: true, // the core of this test!
        preloadModules: true,
      },
    ],
  ],
};
