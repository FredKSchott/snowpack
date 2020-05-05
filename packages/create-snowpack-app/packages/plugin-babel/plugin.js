const babel = require("@babel/core");

exports.build = async function build(fileLoc) {
  const result = await babel.transformFileAsync(fileLoc, {
    cwd: process.cwd(),
  });
  return { result: result.code };
};
