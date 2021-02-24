/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  workspaceRoot: '../',
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
