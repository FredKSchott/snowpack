const svelte = require("svelte/compiler");
const fs = require("fs");
const path = require("path");

let userSvelteConfig = {};
try {
  userSvelteConfig = require(path.join(process.cwd(), "svelte.config.js"));
} catch (err) {
  // no user-provided config found, safe to ignore
}

exports.build = async function build(fileLoc) {
  const { preprocess: preprocessOptions, ...svelteOptions } = userSvelteConfig;
  const fileSource = fs.readFileSync(fileLoc, { encoding: "utf-8" });
  let codeToCompile = fileSource;
  // PRE-PROCESS
  if (preprocessOptions) {
    ({ code: codeToCompile } = await svelte.preprocess(
      fileSource,
      preprocessOptions,
      { filename: fileLoc }
    ));
  }
  // COMPILE
  const result = svelte.compile(codeToCompile, {
    dev: process.env.NODE_ENV !== "production",
    ...svelteOptions,
  });
  return { result: result.js.code };
};
