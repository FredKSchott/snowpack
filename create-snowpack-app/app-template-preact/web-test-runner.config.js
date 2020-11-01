// NODE_ENV=test - Needed by "@snowpack/web-test-runner-plugin"
process.env.NODE_ENV = 'test';

module.exports = {
  plugins: [require('@snowpack/web-test-runner-plugin')()],
};
