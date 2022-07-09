// @remove-file-on-eject
/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

const importMetaBabelPlugin = require('./importMetaBabelPlugin');
const babelJestModule = require('babel-jest');
const babelJest = babelJestModule.__esModule ? babelJestModule.default : babelJestModule;

module.exports = babelJest.createTransformer({
  presets: ['babel-preset-react-app', ['@babel/preset-react', {
    runtime: "automatic"
  }], '@babel/preset-typescript'],
  plugins: [[importMetaBabelPlugin]],
});
