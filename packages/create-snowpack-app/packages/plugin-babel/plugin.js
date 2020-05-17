const babel = require("@babel/core");

module.exports = function plugin(config, options) {
  return {
    defaultBuildScript: "build:js,jsx,ts,tsx",
    async build({ fileContents, filePath }) {
      const result = await babel.transformAsync(fileContents, {
        filename: filePath,
        cwd: process.cwd(),
      });
      return { result: result.code };
    },
  };
};
