const {sass} = require('svelte-preprocess-sass');

module.exports = {
  preprocess: {
    style: sass({}, {name: 'css'}),
  },
};
