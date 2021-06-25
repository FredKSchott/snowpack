function pluginFrom() {
  return {
    postcssPlugin: 'plugin-from',
    AtRule(node, {result, Declaration}) {
      node.replaceWith(new Declaration({prop: 'content', value: `"${result.opts.from}"`}));
    },
  };
}

pluginFrom.postcss = true;

module.exports = {
  plugins: [pluginFrom],
};
