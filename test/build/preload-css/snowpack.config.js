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
        minifyCSS: false,
        minifyHTML: false,
        minifyJS: false,
        preloadCSS: true,
        preloadModules: true,
      },
    ],
  ],
};
