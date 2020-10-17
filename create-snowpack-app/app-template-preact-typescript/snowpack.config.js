module.exports = {
  install: [
    /* ... */
  ],
  plugins: [
    '@snowpack/plugin-dotenv',
    '@snowpack/plugin-babel',
    '@snowpack/plugin-typescript',
    '@prefresh/snowpack',
  ],
  installOptions: {
    installTypes: true,
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
