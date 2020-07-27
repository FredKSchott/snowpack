module.exports = {
  modulePathIgnorePatterns: [
    '<rootDir>/packages/@snowpack/app-template-', // don’t run tests intended as user examples
    '<rootDir>/test/create-snowpack-app/test-install', // don’t run tests inside our mock create-snowpack-app install
  ],
};
