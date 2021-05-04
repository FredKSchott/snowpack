module.exports = {
  mode: 'production',
  plugins: [['@snowpack/plugin-svelte']],
  devOptions: {
    hmr: true,
  },
  buildOptions: {
    sourcemap: true,
  },
  optimize: {
    bundle: true,
    minify: false,
    sourcemap: true,
    target: 'es2018',
  },
};
