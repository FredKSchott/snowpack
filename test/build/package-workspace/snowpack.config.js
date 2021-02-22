/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  root: '../',
  buildOptions: {
    out: './build'
  },
  mount: {
    src: '/_dist_',
  },
  plugins: [
    [
      '@snowpack/plugin-svelte',
    ],
  ],
};
