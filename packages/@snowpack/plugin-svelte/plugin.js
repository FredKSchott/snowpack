const svelte = require("svelte/compiler");
const fs = require("fs");
const path = require("path");

module.exports = function plugin(config, pluginOptions) {
  let svelteOptions;
  let preprocessOptions;
  const userSvelteConfigLoc = path.join(process.cwd(), "svelte.config.js");
  if (fs.existsSync(userSvelteConfigLoc)) {
    const userSvelteConfig = require(userSvelteConfigLoc);
    const { preprocess, ..._svelteOptions } = userSvelteConfig;
    preprocessOptions = preprocess;
    svelteOptions = _svelteOptions;
  }
  // Generate svelte options from user provided config (if given)
  svelteOptions = {
    dev: process.env.NODE_ENV !== "production",
    css: false,
    ...svelteOptions,
    ...pluginOptions,
  };

  return {
    defaultBuildScript: "build:svelte",
    knownEntrypoints: ["svelte/internal"],
    async build({ contents, filePath }) {
      let codeToCompile = contents;
      // PRE-PROCESS
      if (preprocessOptions) {
        codeToCompile = (
          await svelte.preprocess(codeToCompile, preprocessOptions, {
            filename: filePath,
          })
        ).code;
      }
      // COMPILE
      const { js, css } = svelte.compile(codeToCompile, {
        ...svelteOptions,
        filename: filePath,
      });
      const result = { result: js && js.code };
      if (!svelteOptions.css) {
        result.resources = { css: css && css.code };
      }
      return result;
    },
  };
};
