/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    _output: { url: '/', static: true },
    src: { url: '/dist' },
  },
  plugins: [
    ['@snowpack/plugin-run-script', { cmd: 'eleventy', watch: '$1 --watch' }],
  ],
  routes: [
    /* To enable an SPA Fallback in development: */
    // {"match": "routes", "src": ".*", "dest": "/index.html"}
  ],
  packageOptions: {
    /* ... */
  },
  devOptions: {
    // Eleventy updates multiple files at once, so add a 300ms delay before we trigger a browser update
    hmrDelay: 300,
  },
  buildOptions: {
    /* ... */
  },
};
