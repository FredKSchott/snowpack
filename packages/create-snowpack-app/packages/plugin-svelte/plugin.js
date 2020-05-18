const svelte = require("svelte/compiler");
const fs = require("fs");
const path = require("path");

module.exports = function plugin(config, pluginOptions) {
  let svelteOptions;
  let preprocessOptions;
  try {
    const userSvelteConfigLoc = path.join(process.cwd(), "svelte.config.js");
    const userSvelteConfig = require(userSvelteConfigLoc);
    const { preprocess, ..._svelteOptions } = userSvelteConfig;
    preprocessOptions = preprocess;
    svelteOptions = _svelteOptions;
  } catch (err) {
    // no user-provided config found, safe to ignore
  } finally {
    svelteOptions = {
      dev: process.env.NODE_ENV !== "production",
      css: false,
      ...svelteOptions,
      ...pluginOptions,
    };
  }

  return {
    defaultBuildScript: "build:svelte",
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
      return {
        result: js && js.code,
        resources: {
          css: css && css.code,
        },
      };
    },
  };
};
