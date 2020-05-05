const path = require("path");
const setupTestsFile = true;

module.exports = function () {
  return {
    moduleFileExtensions: ["js", "vue"],
    transform: {
      "^.+\\.vue$": "vue-jest",
      "^.+\\.js$": path.resolve(__dirname, "jest/babelTransform.js"),
    },
    testMatch: [
      "<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
      "<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}",
    ],
    testPathIgnorePatterns: ["node_modules"],
    transformIgnorePatterns: ["node_modules"],
    bail: false,
    verbose: true,
    setupFilesAfterEnv: setupTestsFile ? ["<rootDir>/jest.setup.js"] : [],
    globals: {
      "vue-jest": {
        babelConfig: require("./jest/babel.config.json"),
      },
    },
  };
};
