module.exports = {
  modulePathIgnorePatterns: [
    '<rootDir>/create-snowpack-app/app-template-', // don’t run tests intended as user examples
    '<rootDir>/test/create-snowpack-app/test-install', // don’t run tests inside our mock create-snowpack-app install
    '<rootDir>/www', // docs has its own tests
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
};
