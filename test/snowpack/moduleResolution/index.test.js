const {testFixture} = require('../../fixture-utils');
const dedent = require('dedent');

describe('moduleResolution', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Resolves CSS and JS modules from HTML documents', async () => {
    const result = await testFixture(
      {},
      {
        'packages/css-package/package.json': dedent`
          {
            "name": "css-package",
            "version": "1.2.3"
          }
        `,
        'packages/css-package/style.css': dedent`
          body {
            color: red;
          }
        `,
        'index.html': dedent`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <meta name="description" content="Web site created using create-snowpack-app" />
              <title>Snowpack App</title>
              <style>
                @import 'css-package/style.css';
              </style>
              <script type="module">
                import {flatten} from 'array-flatten';
              </script>
            </head>
            <body>
            </body>
          </html> 
        `,
        'package.json': dedent`
          {
            "version": "1.0.1",
            "name": "@snowpack/test-build-scan-imports-html",
            "dependencies": {
              "array-flatten": "^3.0.0",
              "css-package": "file:./packages/css-package"
            }
          }  
        `,
      },
    );
    // HTML imports of packages are scanned
    expect(result['_snowpack/pkg/array-flatten.js']).toBeDefined();
    expect(result['_snowpack/pkg/css-package/style.css']).toBeDefined();
    // HTML imports of packages are rewritten
    expect(result['index.html']).toContain(
      `import {flatten} from './_snowpack/pkg/array-flatten.js';`,
    );
    expect(result['index.html']).toContain(`@import "./_snowpack/pkg/css-package/style.css";`);
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
    expect(result['deep/nested/index.html']).toContain(
      "import preact from '../../_snowpack/pkg/preact.js';",
    );
    expect(result['deep/index.html']).toContain("import preact from '../_snowpack/pkg/preact.js';");
    expect(result['index.html']).toContain("import preact from './_snowpack/pkg/preact.js';");
    expect(result['index.js']).toContain("import './_snowpack/pkg/preact.js';");
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
          import { flatten } from 'array-flatten';
          import a from './a/a.js';
          import b from './b'; 
        `,
        'array-flatten.js': dedent`
          throw new Error('Not me!');
        `,
        'package.json': dedent`
          {
            "version": "1.0.0",
            "name": "@snowpack/test-resolve-js",
            "dependencies": {
              "array-flatten": "^1.0.1"
            }
          }
        `,
      },
    );

    // We are using the node_modules version, not the local 'is-array.js'
    expect(result['_snowpack/pkg/array-flatten.js']).toBeDefined();
    expect(result['index.js']).toContain(
      `import { flatten } from './_snowpack/pkg/array-flatten.js';`,
    );
    // A URL-style import works
    expect(result['a/a.js']).toContain(`import '../index.js';`);
    // We don't mistakenly import an index file from a directory with the same name
    expect(result['index.js']).toContain(`import b from './b.js';`);
  });
});
