const svelte = require("svelte/compiler");
const fs = require("fs");

exports.build = function build(fileLoc) {
  const fileSource = fs.readFileSync(fileLoc, { encoding: "utf-8" });
  const result = svelte.compile(fileSource);
  return { result: result.js.code };
};
