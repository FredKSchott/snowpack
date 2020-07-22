"use strict";
const path = require("path");

module.exports = {
  process(src, filename) {
    const assetFilename = path.basename(filename);
    return `module.exports = {
      __esModule: true,
      default: ${JSON.stringify(assetFilename)},
    };`;
  },
};
