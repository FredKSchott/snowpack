const babel = require("@babel/core");

module.exports = function plugin(config, options) {
  return {
    defaultBuildScript: "build:js,jsx,ts,tsx",
    async build({ contents, filePath, fileContents }) {
      const result = await babel.transformAsync(contents || fileContents, {
        filename: filePath,
        cwd: process.cwd(),
        ast: false,
        compact: false,
      });
      let code = result.code;
      if (code) {
        // Some Babel plugins assume process.env exists, but Snowpack
        // uses import.meta.env instead. Handle this here since it
        // seems to be pretty common.
        // See: https://www.pika.dev/npm/snowpack/discuss/496
        code = code.replace(/process\.env/g, 'import.meta.env');
      }
      return { result: code };
    },
  };
};
