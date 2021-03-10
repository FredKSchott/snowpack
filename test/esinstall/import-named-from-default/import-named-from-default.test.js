const {runTest} = require('../esinstall-test-utils.js');

describe('import named exports from an ESM package with only default export', () => {
  it('throws a helpful error', async () => {
    return expect(() =>
      runTest([{specifier: 'default-only-esm', all: false, default: false, namespace: false, named: ['EventEmitter']}], {cwd: __dirname, treeshake: true}),
    ).rejects.toThrowError(`Module \"default-only-esm\" has no exported member \"EventEmitter\". Did you mean to use \"import EventEmitter from 'default-only-esm'\" instead?`);
  });
});
