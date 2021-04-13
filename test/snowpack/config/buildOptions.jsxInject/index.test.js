const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('buildOptions.jsxInject', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Injects JSX factory function where appropriate', async () => {
    const result = await testFixture({
      'index.html': dedent`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <meta name="description" content="Web site created using create-snowpack-app" />
              <title>Snowpack App</title>
            </head>
            <body>
              <script type="module" src="%PUBLIC_URL%/index.js"></script>
            </body>
          </html>
        `,
      'js-file.js': dedent`export default 'no-jsx';`,
      'ts-file.ts': dedent`export default 'no-jsx';`,
      'jsx-file.jsx': dedent`const Component = () => <><h1>Hello world!</h1></>;`,
      'tsx-file.tsx': dedent`const Component = () => <><h1>Hello world!</h1></>;`,
      'snowpack.config.js': dedent`
        module.exports = {
          buildOptions: {
            jsxInject: 'import { h, Fragment } from "preact";',
          },
        };
      `,
    });
    const injected = 'import {h, Fragment} from "./_snowpack/pkg/preact.js";';
    // Don't inject JSX factory functions where there is no JSX
    expect(result['js-file.js']).not.toContain(injected);
    expect(result['ts-file.js']).not.toContain(injected);
    // Inject JSX factory functions where there is JSX
    expect(result['jsx-file.js']).toContain(injected);
    expect(result['tsx-file.js']).toContain(injected);
  });
});
