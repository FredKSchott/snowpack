// const fs = require("fs");
// const path = require("path");
// const cwd = process.cwd();

const scripts = {
  "mount:public": "mount public --to .",
  "mount:web_modules": "mount web_modules",
  "mount:src": "mount src --to _dist_",
  "build:svelte": "@snowpack/plugin-svelte",
};

module.exports = {
  plugins: ["@snowpack/plugin-svelte"],
  scripts,
  knownEntrypoints: ["svelte/internal"],
  installOptions: {},
  devOptions: {},
};
