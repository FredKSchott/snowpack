module.exports = {
  mount: {
    public: {url: '/', static: true, resolve: false},
    src: {url: '/dist'},
  },
  optimize: {
    bundle: true,
    minify: true,
    sourcemap: true,
    splitting: true,
    treeshake: true,
    target: 'safari11',
  },
  plugins: ['@snowpack/plugin-sass', '@snowpack/plugin-react-refresh'],
};
