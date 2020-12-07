/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: '/',
    src: '/_dist_',
  },
  plugins: [
    '@snowpack/plugin-babel',
    '@snowpack/plugin-dotenv',
    '@snowpack/plugin-sass'
  ],
  install: [
    /* ... */
  ],
  installOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    proxyType: [
      {match: /\.(css|scss|sass)$/, type: "lit-css"}
    ]
  },
  proxy: {
    /* ... */
  },
  alias: {
    /* ... */
  },
};
