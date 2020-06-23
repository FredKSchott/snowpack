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

      return { result: result.code };
    },
  };
};
