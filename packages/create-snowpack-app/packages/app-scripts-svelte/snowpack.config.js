const scripts = {
  "mount:public": "mount public --to /",
  "mount:web_modules": "mount web_modules",
  "mount:src": "mount src --to /_dist_",
  "plugin:svelte": "@snowpack/plugin-svelte",
};

module.exports = {
  scripts,
  knownEntrypoints: ["svelte/internal"],
  installOptions: {},
  devOptions: {},
};
