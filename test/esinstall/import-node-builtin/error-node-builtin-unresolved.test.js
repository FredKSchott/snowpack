const {install} = require('../../../esinstall/lib');
const path = require('path');

describe('node builtins', () => {
  it('throws without a polyfill', async () => {
    const cwd = __dirname;
    const dest = path.join(cwd, 'test-error-node-builtin');

    const targets = ['bad-node-builtin-pkg'];

    const run = async () => {
      await install(targets, {
        cwd,
        dest,
      });
    };

    return expect(run).rejects.toThrow();
  });
});