// @remove-file-on-eject
/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
"use strict";

const babelJest = require("babel-jest");

module.exports = babelJest.createTransformer({
  presets: [require.resolve("babel-preset-react-app")],
  plugins: [
    [
      "@snowpack/babel-plugin-package-import",
      {
        webModulesUrl: "./web_modules",
        ignore: [
          "react",
          "react-dom",
          "@testing-library/react",
          "@testing-library/jest-dom/extend-expect",
        ],
      },
    ],
  ],
});
