/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    eleventy: '/',
    src: '/_dist_',
  },
  plugins: [
    ['@snowpack/plugin-run-script', { cmd: 'eleventy', watch: '$1 --watch --quiet' }],
    ['@snowpack/plugin-sass', { compilerOptions: { style: 'compressed' } }],
    ['@snowpack/plugin-postcss', {}],
  ],
  packageOptions: {
    source: 'skypack',
    types: true,
  },
  devOptions: {
    // Eleventy updates multiple files at once, so add a 1000ms delay before we trigger a browser update
    hmrDelay: 1000,
  },
  buildOptions: {
    out: '_site',
  },
};
