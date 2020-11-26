const path = require('path');
const tmp = path.join(__dirname, 'tmp');
process.chdir(tmp);

const execa = require('execa');
const {readdirSync, readFileSync, statSync, existsSync, writeFileSync} = require('fs');
const glob = require('glob');
const {loadAndValidateConfig, startDevServer} = require('snowpack');

describe('snowpack build fixtures', () => {
  const config = loadAndValidateConfig(
    {devOptions: {hmr: false, open: 'none', output: 'stream'}},
    {},
  );
  let snowpack;

  beforeAll(async () => {
    snowpack = await startDevServer({
      cwd: tmp,
      config,
      lockfile: null,
      pkgManifest: {},
    });
  });

  afterAll(() => {
    return snowpack.shutdown();
  });

  for (const testName of readdirSync(__dirname)) {
    if (!testName.endsWith('.json')) {
      continue;
    }

    const testDatas = require(path.join(__dirname, testName));
    for (const {id, input, output} of testDatas) {
      it(id, async () => {
        writeFileSync(path.join(tmp, 'test.js'), input);
        const result = await snowpack.loadUrl('test.js');
        expect(result.contents.toString()).toEqual(output);
      });
    }
  }
});
