module.exports = {
  install: [
    /* ... */
  ],
  plugins: ['@snowpack/plugin-vue', '@snowpack/plugin-dotenv'],
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
