const {load} = require('signal-exit');

module.exports = function () {
  return {
    resolve: {
      input: ['.svelte'],
      output: ['.js', '.css'],
    },
    load() {
      // Not tested in this test.
      return null;
    },
  };
};
