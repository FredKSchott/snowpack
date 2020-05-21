const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const isTS = fs.existsSync(path.join(cwd, "tsconfig.json"));

const scripts = {
  "mount:public": "mount public --to /",
  "mount:src": "mount src --to /_dist_",
};

if (isTS) {
  scripts["run:tsc"] = "tsc --noEmit";
  scripts["run:tsc::watch"] = "$1 --watch";
}

module.exports = {
  scripts,
  plugins: ["@snowpack/plugin-babel", "@prefresh/snowpack"],
  devOptions: {},
  installOptions: {
    installTypes: isTS,
  },
};
