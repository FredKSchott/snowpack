// NOTE: THIS IS CURRENTLY DISABLED UNTIL ESBUILD SUPPORTS ESM->CJS WITHOUT BUNDLING
// SEE: https://github.com/evanw/esbuild/issues/109

"use strict";
const path = require("path");
const execa = require("execa");
const esbuildPath = require.resolve("esbuild");
const esbuildBin = path.resolve(esbuildPath, "..", "..", "bin", "esbuild");

module.exports = {
  process(contents, filename) {
    const result = execa.sync(
      esbuildBin,
      [
        `--loader=${path.extname(filename).substr(1)}`,
        "--format=cjs",
        "--platform=node",
        "--target=es2019",
      ],
      { input: contents }
    );
    // QUESTION: Should this be `contents`?
    return { code: result.stdout };
  },
};
