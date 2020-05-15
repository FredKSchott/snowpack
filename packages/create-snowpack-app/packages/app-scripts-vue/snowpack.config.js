const scripts = {
  "mount:public": "mount public --to /",
  "mount:web_modules": "mount web_modules",
  "mount:src": "mount src --to /_dist_",
  "build:vue": "@snowpack/plugin-vue",
};

module.exports = {
  plugins: ["@snowpack/plugin-vue"],
  scripts,
  installOptions: {},
  devOptions: {},
};
