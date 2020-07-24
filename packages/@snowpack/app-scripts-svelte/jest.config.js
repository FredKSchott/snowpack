const fs = require("fs");
const path = require("path");

// Use this instead of `paths.testsSetup` to avoid putting
// an absolute filename into configuration after ejecting.
// const setupTestsFile = fs.existsSync(paths.testsSetup)
//   ? `<rootDir>/src/setupTests.js`
//   : undefined;
const setupTestsFile = true;

module.exports = function () {

  const userSvelteConfig = getUserSvelteConfig();

  return {
    testMatch: [
      "<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
      "<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}",
    ],
    transform: {
      "^.+\\.svelte$": [
        "jest-transform-svelte",
        { preprocess: userSvelteConfig.preprocess },
      ],
      "^.+\\.(js|ts)$": path.resolve(__dirname, "jest/babelTransform.js"),
    },
    moduleFileExtensions: ["js", "ts", "svelte"],
    testPathIgnorePatterns: ["node_modules"],
    transformIgnorePatterns: ["node_modules"],
    bail: false,
    verbose: true,
    setupFilesAfterEnv: setupTestsFile ? ["<rootDir>/jest.setup.js"] : [],
  };
};

function getUserSvelteConfig() {
   const userSvelteConfigLoc = path.join(process.cwd(), "svelte.config.js");
   if (fs.existsSync(userSvelteConfigLoc)) {
     return require(userSvelteConfigLoc);
   }

   return {};
}
