/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: {url: '/', static: true},
    src: {url: '/dist'},
  },
  plugins: [
    /* ... */
  ],
  routes: [
    /* To enable an SPA Fallback in development: */
    // {"match": "routes", "src": ".*", "dest": "/index.html"}
  ],
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
};
