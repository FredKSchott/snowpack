/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    eleventy: '/',
    src: '/_dist_',
  },
  plugins: [
    [
      '@snowpack/plugin-run-script',
      { cmd: 'eleventy', watch: '$1 --watch --quiet' },
    ],
    ['@snowpack/plugin-sass', { compilerOptions: { style: 'compressed' } }],
    ['@snowpack/plugin-postcss', {}],
  ],
  packageOptions: {
    // Blocked by CSS asset support
    // source: 'remote',
    // types: true,
  },
  devOptions: {
    // Eleventy updates multiple files at once, so add a delay before we trigger file watching
    hmrDelay: 5000,
  },
  buildOptions: {
    out: '_site',
  },
  optimize: {
    bundle: true,
    minify: true,
    target: 'es2018',
  },
};
