const {startServer, createConfiguration} = require('snowpack');
const {version: pkgVersion} = require('preact/package.json');

describe('getUrlForPackage', () => {
  beforeAll(() => {
    require('snowpack').logger.level = 'warn';
  });

  it('resolves pkg with version number', async () => {
    const config = createConfiguration({
      root: __dirname,
      devOptions: {
        port: 0,
      },
      mount: {
        ['src']: '/_dist_',
      },
    });
    const sp = await startServer({config, lockfile: null});
    const preact = await sp.getUrlForPackage('preact');
    const preactHooks = await sp.getUrlForPackage('preact/hooks');

    expect(preact).toBe(`/_snowpack/pkg/preact.v${pkgVersion}.js`);
    expect(preactHooks).toBe(`/_snowpack/pkg/preact.hooks.v${pkgVersion}.js`);
    return sp.shutdown();
  });

  it('resolves pkg with version number when metaDir is set', async () => {
    const config = createConfiguration({
      root: __dirname,
      devOptions: {
        port: 0,
      },
      mount: {
        ['src']: '/_dist_',
      },
      buildOptions: {
        metaUrlPath: '/_test',
      },
    });
    const sp = await startServer({config, lockfile: null});
    const preact = await sp.getUrlForPackage('preact');
    const preactHooks = await sp.getUrlForPackage('preact/hooks');

    expect(preact).toBe(`/_test/pkg/preact.v${pkgVersion}.js`);
    expect(preactHooks).toBe(`/_test/pkg/preact.hooks.v${pkgVersion}.js`);
    return sp.shutdown();
  });
});
