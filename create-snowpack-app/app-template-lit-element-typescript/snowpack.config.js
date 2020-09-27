module.exports = {
  mount: {
    public: '/',
    src: '/_dist_',
  },
  plugins: [
    '@snowpack/plugin-babel',
    '@snowpack/plugin-dotenv',
    [
      '@snowpack/plugin-run-script',
      { cmd: 'tsc --noEmit', watch: '$1 --watch' },
    ],
  ],
};
