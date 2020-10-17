module.exports = {
  install: [
    /* ... */
  ],
  plugins: [
    ['@snowpack/plugin-run-script', { cmd: 'eleventy', watch: '$1 --watch' }],
  ],
  installOptions: {
    /* ... */
  },
  devOptions: {
    hmrDelay: 300,
  },
  buildOptions: {
    /* ... */
  },
  proxy: {
    /* ... */
  },
  mount: {
    _output: '/',
    src: '/_dist_',
  },
  alias: {
    /* ... */
  },
};
