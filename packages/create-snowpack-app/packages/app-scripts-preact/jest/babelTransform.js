// @remove-file-on-eject
/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
("use strict");

const babelJest = require("babel-jest");

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
    [
      "@babel/preset-react",
      {
        pragma: "h",
        pragmaFrag: "Fragment",
      },
    ],
    "@babel/preset-typescript",
  ],
  plugins: ["@babel/plugin-syntax-import-meta"],
});
