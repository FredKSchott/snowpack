module.exports = {
  mode: 'production',
  devOptions: {
    hmr: true,
  },
  buildOptions: {
    sourcemaps: true,
  },
  optimize: {
    bundle: true,
    minify: false,
    sourcemap: true,
    target: 'es2018',
  },
};
