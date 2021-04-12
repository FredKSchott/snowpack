const {testFixture} = require('../../fixture-utils');
const dedent = require('dedent');

describe('moduleResolution', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'warn';
  });

  it('Resolves modules in both JS and nested HTML documents', async () => {
    const result = await testFixture(
      {},
      {
        'deep/nested/index.html': dedent`
          <html>
            <body>
              <script type="module">
                import preact from 'preact';
                import '../../index.js';
              </script>
            </body>
          </html>
        `,
        'deep/index.html': dedent`
          <html>
            <body>
              <script type="module">
                import preact from 'preact';
                import '../index.js';
              </script>
            </body>
          </html>
        `,
        'index.html': dedent`
          <html>
            <body>
              <script type="module">
                import preact from 'preact';
                import './index.js';
              </script>
            </body>
          </html>
        `,
        'index.js': dedent`
          import 'preact';
        `,
      },
    );
    expect(result['deep/nested/index.html']).toEqual(
      expect.stringContaining("import preact from '../../_snowpack/pkg/preact.js';"),
    );
    expect(result['deep/index.html']).toEqual(
      expect.stringContaining("import preact from '../_snowpack/pkg/preact.js';"),
    );
    expect(result['index.html']).toEqual(
      expect.stringContaining("import preact from './_snowpack/pkg/preact.js';"),
    );
    expect(result['index.js']).toEqual(
      expect.stringContaining("import './_snowpack/pkg/preact.js';"),
    );
  });

  it('Resolves modules with circular dependencies in mixed TS/JS', async () => {
    const result = await testFixture(
      {},
      {
        'a/a.js': dedent`
          import '/index.js';
        `,
        'b/b.js': dedent`
          throw new Error('Not me either!');
        `,
        'b.ts': dedent`
          import '/index.js';
        `,
        'index.js': dedent`
          import isArray from 'is-array';
          import a from './a/a.js';
          import b from './b'; 
        `,
        'is-array.js': dedent`
          throw new Error('Not me!');
        `,
        'package.json': dedent`
          {
            "version": "1.0.0",
            "name": "@snowpack/test-resolve-js",
            "dependencies": {
              "is-array": "^1.0.1"
            }
          }
        `,
      },
    );

    // We are using the node_modules version, not the local 'is-array.js'
    expect(result['_snowpack/pkg/is-array.js']).toBeDefined();
    expect(result['index.js']).toContain(`import isArray from './_snowpack/pkg/is-array.js';`);
    // A URL-style import works
    expect(result['a/a.js']).toContain(`import '../index.js';`);
    // We don't mistakenly import an index file from a directory with the same name
    expect(result['index.js']).toContain(`import b from './b.js';`);
  });
});
