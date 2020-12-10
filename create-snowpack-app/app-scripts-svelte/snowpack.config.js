module.exports = {
  mount: {
    public: {url: '/', static: true},
    src: {url: '/_dist_', static: false},
  },
  plugins: ['@snowpack/plugin-svelte', '@snowpack/plugin-dotenv'],
};
