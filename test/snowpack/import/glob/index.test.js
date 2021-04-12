const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('glob', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Imports various globs correctly', async () => {
    const result = await testFixture(
      {
        alias: {
          '@root': './',
        },
      },
      {
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
      },
    );
    expect(result).toMatchSnapshot();
  });
});
