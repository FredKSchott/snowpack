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
        minifyHTML: false, // makes diffs easier to compare
        minifyJS: false,
        preloadCSS: true, // the core of this test!
        preloadModules: true,
      },
    ],
  ],
};
