// @remove-file-on-eject
/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const babelJest = require("babel-jest");
const importMetaBabelPlugin = require("./importMetaBabelPlugin");

const userBabelConfig = getUserBabelConfig();

module.exports = babelJest.createTransformer({
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          node: "current",
        },
      },
    ],
    ...(userBabelConfig.presets || [])
  ],
  plugins: [[importMetaBabelPlugin]],
});

function getUserBabelConfig() {
   const userBabelConfigLoc = path.join(process.cwd(), "babel.config.json");
   if (fs.existsSync(userBabelConfigLoc)) {
     return require(userBabelConfigLoc);
   }

   return {};
}
