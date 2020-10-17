module.exports = {
  install: [
    /* ... */
  ],
  plugins: ['@snowpack/plugin-dotenv', '@prefresh/snowpack'],
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
