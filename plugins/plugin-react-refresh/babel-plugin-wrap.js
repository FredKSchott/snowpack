
module.exports = function (babel) {
  const { types: t } = babel;

  function parseCode(code) {
  	const block = babel.parse(code);
    const body = block.program.body;
    return body.length === 0 ? block.comments : body;
  }

  return {
    name: "babel-plugin-wrap",
    visitor: {
      Program: {
        exit(path, state) {
          const {header, footer} = state.opts
          if (header) {
            const headerNodes = parseCode(header);
            path.unshiftContainer('body', ...headerNodes);
          }

          if (footer) {
            const footerNodes = parseCode(footer);
            path.pushContainer('body', ...footerNodes);
          }
        }
      }
    }
  };
}
