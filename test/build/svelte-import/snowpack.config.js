module.exports = {
  install: ['svelte', 'canvas-confetti'],
  mount: {
    public: '/',
    src: '/_dist_',
  },
  plugins: ['@snowpack/plugin-svelte'],
};
