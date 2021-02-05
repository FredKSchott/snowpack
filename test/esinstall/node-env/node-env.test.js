const fs = require('fs');
const path = require('path');
const {runTest} = require('../esinstall-test-utils.js');

describe('node-env', () => {
  it('inlines data if specified', async () => {
    const dest = path.join(__dirname, 'test-basic');

    const env = {
      ENV_STRING: 'string',
      ENV_NUMBER: 23,
      ENV_BOOLEAN: true,
      ENV_ARRAY: [1],
      ENV_OBJECT: {obj: true},
      ENV_NULL: null,
      ENV_UNDEFINED: undefined,
    };

    await runTest(['node-env-mock-pkg'], {dest, env, cwd: 'test-success'});

    const nodeEnvMockPkg = fs.readFileSync(path.join(dest, 'node-env-mock-pkg.js'), 'utf8');

    // positive test
    expect(nodeEnvMockPkg).toEqual(expect.stringContaining(`string = "string";`));
    expect(nodeEnvMockPkg).toEqual(expect.stringContaining(`number = 23;`));
    expect(nodeEnvMockPkg).toEqual(expect.stringContaining(`boolean = undefined;`));
    expect(nodeEnvMockPkg).toEqual(expect.stringContaining(`define_process_env_ENV_ARRAY_default = [1];`));
    expect(nodeEnvMockPkg).toEqual(expect.stringContaining(`define_process_env_ENV_OBJECT_default = {obj};`));
    expect(nodeEnvMockPkg).toEqual(expect.stringContaining(`nullValue = null;`));
    expect(nodeEnvMockPkg).toEqual(expect.stringContaining(`undefinedValue = undefined;`));

    // inverse test (ensure polyfill not loaded)
    expect(nodeEnvMockPkg).not.toEqual(expect.stringContaining(`/* SNOWPACK PROCESS POLYFILL`));
  });

  it('loads polyfill if env vars missing', async () => {
    const dest = path.join(__dirname, 'test-polyfill');
    const env = {
      ENV_STRING: 'string',
    };

    await runTest(['node-env-mock-pkg'], {dest, env, cwd: __dirname});

    const nodeEnvMockPkg = fs.readFileSync(path.join(dest, 'node-env-mock-pkg.js'), 'utf8');

    // positive test
    expect(nodeEnvMockPkg).toEqual(expect.stringContaining(`string = "string";`));
    expect(nodeEnvMockPkg).toEqual(
      expect.stringContaining(`number = process.env.ENV_NUMBER;`),
    );
    // inverse test (ensure value is not inlined also somewhere)
    expect(nodeEnvMockPkg).not.toEqual(expect.stringContaining(`number = 23;`));
  });
});
