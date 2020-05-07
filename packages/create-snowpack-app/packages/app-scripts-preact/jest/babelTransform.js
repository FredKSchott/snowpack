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
  presets: [
    [require.resolve("@babel/preset-env"), {
      targets: {
        node: 'current',
      },
    }],
    [require.resolve("@babel/preset-react"), {
      pragma: "h",
      pragmaFrag: "Fragment"
    }],
    require.resolve("@babel/preset-typescript"),
  ],
  plugins: [
    "@babel/plugin-syntax-import-meta",
    "babel-plugin-macros",
    [
      "@snowpack/babel-plugin-package-import",
      {
        webModulesUrl: "./web_modules",
        ignore: [
          "preact",
          "preact/hooks",
          "preact/debug",
          "preact/compat",
          "@testing-library/preact",
          "@testing-library/jest-dom/extend-expect",
        ],
      },
    ],
  ],
});
