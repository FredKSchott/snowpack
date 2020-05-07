module.exports = {
  installOptions: {
    rollup: {
      plugins: [require('rollup-plugin-svelte')()],
    },
  },
};
