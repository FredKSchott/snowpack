module.exports = {
  install: [
    /* ... */
  ],
  plugins: [
    '@snowpack/plugin-babel',
    '@snowpack/plugin-dotenv',
    '@snowpack/plugin-typescript',
  ],
  installOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
  proxy: {
    /* ... */
  },
  mount: {
    public: '/',
    src: '/_dist_',
  },
  alias: {
    /* ... */
  },
};
