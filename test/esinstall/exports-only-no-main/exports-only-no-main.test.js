const {runTest} = require('../esinstall-test-utils.js');
const execa = require('execa');
const path = require('path');

describe('Package with only exports and no main', () => {
  it('Is able to install the dependencies without error', async () => {
    const cwd = __dirname;

    await execa('yarn', ['--silent', 'run', 'testinstall'], {
      cwd,
      reject: true
    });
  });
});