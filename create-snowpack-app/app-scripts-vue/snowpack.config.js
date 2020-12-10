module.exports = {
  mount: {
    public: {url: '/', static: true},
    src: {url: '/_dist_'},
  },
  plugins: ['@snowpack/plugin-vue', '@snowpack/plugin-dotenv'],
};
