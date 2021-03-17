module.exports = {
  mount: {
    './src': '/_dist_',
  },
  buildOptions: {
    jsxInject: 'import { h, Fragment } from "preact";'
  }
};
