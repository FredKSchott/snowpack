const scripts = {
  "mount:public": "mount public --to /",
  "mount:web_modules": "mount web_modules",
  "mount:src": "mount src --to /_dist_",
};

module.exports = {
  scripts,
  plugins: ["@snowpack/plugin-vue"],
  installOptions: {},
  devOptions: {},
};
