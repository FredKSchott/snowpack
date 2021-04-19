const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

const advanced = {
  'src/g/dep.js': dedent`
    console.log('dep');      
  `,
  'src/g/index.jsx': dedent`
    import './dep';
    console.log('index');      
  `,
  'src/g/main.html': dedent`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Web site created using create-snowpack-app" />
        <title>Snowpack App</title>
      </head>
      <body>
        <script type="module" src="%PUBLIC_URL%/_dist_/index.js"></script>
        <script type="module">
          import './dep';
          console.log('main');
        </script>
      </body>
    </html>   
  `
};

const node_modules = {
  'node_modules/explicit/index.js': dedent`
    console.log('explicit');
  `,
  'node_modules/explicit/node_modules/implicit/index.js': dedent`
    console.log('implicit:nested');
  `,
  'node_modules/implicit/index.js': dedent`
    console.log('implicit');
  `
}

describe('mount', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Allows direct mappings', async () => {
    const result = await testFixture({
      'a/index.js': dedent`console.log('a');`,
      'snowpack.config.js': dedent`
        module.exports = {
          mount: {
            a: '/a'
          }
        };
      `,
    });
    expect(result['a/index.js']).toContain("console.log('a');");
  });

  it('Allows renamed mappings', async () => {
    const result = await testFixture({
      'src/b/index.js': dedent`console.log('b');`,
      'snowpack.config.js': dedent`
        module.exports = {
          mount: {
            'src/b': '/new-b'
          }
        };
      `,
    });
    expect(result['new-b/index.js']).toContain("console.log('b');");
  });

  it('Allows deep to deep renamed mappings', async () => {
    const result = await testFixture({
      'src/c/index.js': dedent`console.log('c');`,
      'snowpack.config.js': dedent`
        module.exports = {
          mount: {
            'src/c': '/deep/c'
          }
        };
      `,
    });
    expect(result['deep/c/index.js']).toContain("console.log('c');");
  });

  it('Allows mapping to directory with a trailing slash', async () => {
    const result = await testFixture({
      'src/d/index.js': dedent`console.log('d');`,
      'snowpack.config.js': dedent`
        module.exports = {
          mount: {
            'src/d': '/bad/d'
          }
        };
      `,
    });
    expect(result['bad/d/index.js']).toContain("console.log('d');");
  });

  it('Allows deep to shallow renamed mappings', async () => {
    const result = await testFixture({
      'src/e/f/index.js': dedent`console.log('e/f');`,
      'snowpack.config.js': dedent`
        module.exports = {
          mount: {
            'src/e/f': '/e'
          }
        };
      `,
    });
    expect(result['e/index.js']).toContain("console.log('e/f');");
  });

  it('Allows mappings with transforms and import resolution on HTML and JS', async () => {
    const result = await testFixture({
      ...advanced,
      'snowpack.config.js': dedent`
        module.exports = {
          mount: {
            'src/g': {
              url: '/g',
              static: false,
              resolve: true,
            },
          }
        };
      `,
    });
    // JSX was transformed and imports resolved
    expect(result['g/index.jsx']).not.toBeDefined();
    expect(result['g/index.js']).toContain('import "./dep.js";');
    // HTML imports were resolved
    expect(result['g/main.html']).not.toContain('%PUBLIC_URL%');
    expect(result['g/main.html']).toContain("import './dep.js';");
  });

  it('Allows mappings with no transforms or import resolution on HTML and JS', async () => {
    const result = await testFixture({
      ...advanced,
      'snowpack.config.js': dedent`
        module.exports = {
          mount: {
            'src/g': {
              url: '/g',
              static: true,
              resolve: false,
            },
          }
        };
      `,
    });
    // JSX was not transformed and inputs not resolved
    expect(result['g/index.js']).not.toBeDefined();
    expect(result['g/index.jsx']).toContain("import './dep';");
    // HTML imports were not resolved
    expect(result['g/main.html']).toContain('%PUBLIC_URL%');
    expect(result['g/main.html']).toContain("import './dep';");
  });

  it('Allows mappings with transforms but no import resolution on HTML and JS', async () => {
    const result = await testFixture({
      ...advanced,
      'snowpack.config.js': dedent`
        module.exports = {
          mount: {
            'src/g': {
              url: '/g',
              static: false,
              resolve: false,
            },
          }
        };
      `,
    });
    // JSX was transformed but imports not resolved
    expect(result['g/index.js']).toContain('import "./dep";');
    // HTML imports were not resolved
    expect(result['g/main.html']).toContain('%PUBLIC_URL%');
    expect(result['g/main.html']).toContain("import './dep';");
  });

  it('Allows mappings with no transforms but import resolution on HTML', async () => {
    const result = await testFixture({
      ...advanced,
      'snowpack.config.js': dedent`
        module.exports = {
          mount: {
            'src/g': {
              url: '/g',
              static: true,
              resolve: true,
            },
          }
        };
      `,
    });
    // JSX was not transformed and imports not resolved
    expect(result['g/index.jsx']).toContain("import './dep';");
    // HTML imports were resolved
    expect(result['g/main.html']).not.toContain('%PUBLIC_URL%');
    expect(result['g/main.html']).toContain("import './dep.js';");
  });

  it('Allows explicity mounting directories within node_modules but does not mount implicit node_modules files', async () => {
    const result = await testFixture({
      ...node_modules,
      'snowpack.config.js': dedent`
        module.exports = {
          mount: {
            'node_modules/explicit': {
              url: '/explicit',
              static: false,
              resolve: true
            },
          }
        };
      `,
    });

    // Mounted node_modules directory is correctly transformed
    expect(result['explicit/index.js']).toContain("explicit");
    // Unmounted node_modules directories are not included
    expect(result['explicit/node_modules/implicit/index.js']).not.toBeDefined();
    expect(result['node_modules/implicit/index.js']).not.toBeDefined();
  });
});
