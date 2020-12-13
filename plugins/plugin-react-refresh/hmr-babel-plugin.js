const fs = require('fs');

/**
 * @param {import("@babel/core")} babel
 * @param {{id: string|number}} options
 * @returns {import("@babel/core").PluginObj}
 */
module.exports = function plugin(babel, options = {}) {
  if (!options.id) {
    throw new Error('id is required');
  }

  const reactRefreshSetup = babel.template.program(
    fs.readFileSync(require.resolve('./template/reatc-refresh-setup.js'), {encoding: 'utf-8'}),
    {
      placeholderPattern: /^\$\$[_A-Z0-9]+\$\$$/,
      preserveComments: true,
    },
  );

  const setup = reactRefreshSetup({
    $$REGISTER_ID$$: babel.types.stringLiteral(String(options.id)),
  });

  const connect = babel.template.program.ast(
    fs.readFileSync(require.resolve('./template/reatc-refresh-connect.js'), {
      encoding: 'utf-8',
    }),
    {
      preserveComments: true,
    },
  );

  return {
    visitor: {
      Program: {
        exit(path) {
          path.node.body.unshift(setup);
          path.node.body.push(connect);
        },
      },
    },
  };
};
