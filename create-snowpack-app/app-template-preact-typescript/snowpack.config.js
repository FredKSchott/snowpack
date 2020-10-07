module.exports = {
  mount: {
    public: '/',
    src: '/_dist_',
  },
  plugins: [
    '@snowpack/plugin-dotenv',
    '@snowpack/plugin-babel',
    '@prefresh/snowpack',
  ],
  installOptions: {
    installTypes: true,
  },
};
