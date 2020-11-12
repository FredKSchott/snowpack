module.exports = {
  mount: {
    eleventy: '/',
    src: '/_dist_',
  },
  plugins: [
    ['@snowpack/plugin-run-script', { cmd: 'eleventy', watch: '$1 --watch' }],
  ],
  install: [
    /* ... */
  ],
  installOptions: {
    /* ... */
  },
  devOptions: {
    // Eleventy updates multiple files at once, so add a 300ms delay before we trigger a browser update
    hmrDelay: 300,
  },
  buildOptions: {
    out: '_site',
  },
  proxy: {
    /* ... */
  },
  alias: {
    /* ... */
  },
};
