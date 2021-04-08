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
});
