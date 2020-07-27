const template = require("@babel/template").default;

const PUBLIC_ENV_REGEX = /^SNOWPACK_PUBLIC_/;
function generateEnvObject(mode) {
  const envObject = { ...process.env };
  for (const env of Object.keys(envObject)) {
    if (!PUBLIC_ENV_REGEX.test(env)) {
      delete envObject[env];
    }
  }
  envObject.MODE = mode;
  envObject.NODE_ENV = mode;
  return envObject;
}

/**
 * Add import.meta.env support
 * Note: import.meta.url is not supported at this time
 */
module.exports = function () {
  const ast = template.ast(`
  ({env: ${JSON.stringify(generateEnvObject("test"))}})
`);
  return {
    visitor: {
      MetaProperty(path, state) {
        path.replaceWith(ast);
      },
    },
  };
};
