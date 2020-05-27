const scripts = {
  "mount:public": "mount public --to /",
  "mount:src": "mount src --to /_dist_",
};

module.exports = {
  plugins: ["@snowpack/plugin-svelte"],
  scripts,
  installOptions: {},
  devOptions: {},
};
