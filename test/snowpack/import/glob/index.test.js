const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

const directory = {
  'deep/nest/globAbsolute.js': dedent`const modules = import.meta.glob('/pages/*.js');`,
  'deep/nest/globAlias.js': dedent`const modules = import.meta.glob('@root/pages/*.js');`,
  'pages/a.js': dedent`export default 'a'`,
  'pages/b.js': dedent`export default 'b'`,
  'pages/c.js': dedent`export default 'c'`,
  'glob.js': dedent`const modules = import.meta.glob('./pages/*.js');`,
  'globAbsolute.js': dedent`const modules = import.meta.glob('/pages/*.js');`,
  'globAlias.js': dedent`const modules = import.meta.glob('@root/pages/*.js');`,
  'globCommented.js': dedent`
    /* import.meta.glob('./pages/*.js'); */
    // import.meta.glob('./pages/*.js');
    
    const modules = null; // import.meta.glob('./pages/*.js');
    
    /* *** //
    * import.meta.glob('./pages/*.js');
    */
  `,
  'globEager.js': dedent`const modules = import.meta.globEager('./pages/*.js');`,
  'globSelf.js': dedent`const modules = import.meta.glob('./*.js');`,
  'snowpack.config.js': dedent`
    module.exports = {
      alias: {
        '@root': './',
      }
    }
  `,
};

describe('glob', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Imports from directory', async () => {
    const result = await testFixture(directory);
    expect(result['glob.js']).toContain(`"./pages/a.js": () => import("./pages/a.js")`);
    expect(result['glob.js']).toContain(`"./pages/b.js": () => import("./pages/b.js")`);
    expect(result['glob.js']).toContain(`"./pages/c.js": () => import("./pages/c.js")`);
  });

  it('Imports from directory using absolute paths', async () => {
    const result = await testFixture(directory);
    expect(result['globAbsolute.js']).toContain(`"./pages/a.js": () => import("./pages/a.js")`);
    expect(result['globAbsolute.js']).toContain(`"./pages/b.js": () => import("./pages/b.js")`);
    expect(result['globAbsolute.js']).toContain(`"./pages/c.js": () => import("./pages/c.js")`);
  });

  it('Imports from directory using aliases', async () => {
    const result = await testFixture(directory);
    expect(result['globAlias.js']).toContain(`"./pages/a.js": () => import("./pages/a.js")`);
    expect(result['globAlias.js']).toContain(`"./pages/b.js": () => import("./pages/b.js")`);
    expect(result['globAlias.js']).toContain(`"./pages/c.js": () => import("./pages/c.js")`);
  });

  it('Imports from nested directory when using absolute paths', async () => {
    const result = await testFixture(directory);
    expect(result['deep/nest/globAbsolute.js']).toContain(
      `"../../pages/a.js": () => import("../../pages/a.js")`,
    );
    expect(result['deep/nest/globAbsolute.js']).toContain(
      `"../../pages/b.js": () => import("../../pages/b.js")`,
    );
    expect(result['deep/nest/globAbsolute.js']).toContain(
      `"../../pages/c.js": () => import("../../pages/c.js")`,
    );
  });

  it('Imports from nested directory when using aliases', async () => {
    const result = await testFixture(directory);
    expect(result['deep/nest/globAlias.js']).toContain(
      `"../../pages/a.js": () => import("../../pages/a.js")`,
    );
    expect(result['deep/nest/globAlias.js']).toContain(
      `"../../pages/b.js": () => import("../../pages/b.js")`,
    );
    expect(result['deep/nest/globAlias.js']).toContain(
      `"../../pages/c.js": () => import("../../pages/c.js")`,
    );
  });

  it('Statically imports from directory when using eagar', async () => {
    const result = await testFixture(directory);
    expect(result['globEager.js']).toContain(`import * as __glob__0_0 from './pages/a.js';`);
    expect(result['globEager.js']).toContain(`import * as __glob__0_1 from './pages/b.js';`);
    expect(result['globEager.js']).toContain(`import * as __glob__0_2 from './pages/c.js';`);
  });

  it('Ignores commented out module imports', async () => {
    const result = await testFixture(directory);
    expect(result['globCommented.js']).toContain(`const modules = null;`);
  });

  it('Does not import itself', async () => {
    const result = await testFixture(directory);
    expect(result['globSelf.js']).not.toContain(`globSelf.js`);
  });
});
