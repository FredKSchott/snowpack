const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const isTS = fs.existsSync(path.join(cwd, "tsconfig.json"));

const scripts = {
  "mount:public": "mount public --to /",
  "mount:web_modules": "mount web_modules",
  "mount:src": "mount src --to /_dist_",
};

if (isTS) {
  scripts["run:tsc"] = "tsc --noEmit";
  scripts["run:tsc::watch"] = "$1 --watch";
}

const buildId = isTS ? "build:js,ts" : "build:js";
if (
  fs.existsSync(path.join(cwd, "babel.config.json")) ||
  fs.existsSync(path.join(cwd, "babel.config.js")) ||
  fs.existsSync(path.join(cwd, "babel.config.cjs")) ||
  fs.existsSync(path.join(cwd, "babel.config.mjs"))
) {
  scripts[buildId] = "babel --filename $FILE";
} else {
  const bundledConfig = path.join(__dirname, "babel.config.json");
  scripts[buildId] = `babel --filename $FILE --config-file ${bundledConfig}`;
}

module.exports = {
  scripts,
  devOptions: {},
  installOptions: {
    installTypes: isTS,
  },
};
