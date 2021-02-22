'use strict';

const template = require('@babel/template').default;

/**
 * Add import.meta.env support
 * Note: import.meta.url is not supported at this time
 */
module.exports = function importMetaBabelPlugin() {
  const ast = template.ast(`
  ({
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([k]) => /^SNOWPACK_PUBLIC_/.test(k)),
      ),
      MODE: 'test',
      NODE_ENV: 'test',
    },
  })
`);
  return {
    visitor: {
      MetaProperty(path) {
        path.replaceWith(ast);
      },
    },
  };
};
