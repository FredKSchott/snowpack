const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('package', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it.skip('Loads workspace module correctly', async () => {
    const result = await testFixture(
      {
        workspaceRoot: '../build',
        plugins: [['@snowpack/plugin-svelte']],
      },
      {
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
              <script type="module" src="%PUBLIC_URL%/_dist_/index.svelte.js"></script>
              <!--
                This HTML file is a template.
                If you open it directly in the browser, you will see an empty page.
          
                You can add webfonts, meta tags, or analytics to this file.
                The build step will place the bundled scripts into the <body> tag.
              -->
            </body>
          </html> 
        `,
        'index.svelte': dedent`
          <style>
            div {
                color: red;
            }
          </style>
          <script>
            import TestComponent from 'test-workspace-component/SvelteComponent.svelte';
            import * as tsFile from 'test-workspace-component/works-without-extension';
            import * as main from 'test-workspace-component';
            console.log(tsFile, main);
          </script>

          <TestComponent />
        `,
        'package.json': dedent`
          {
            "version": "1.0.1",
            "name": "@snowpack/test-package-workspace",
            "dependencies": {
              "test-workspace-component": "^1.0.0"
            }
          } 
        `,
      },
    );

    // Files were created in the correct location
    // expect(result['_snowpack/pkg/']).toBeDefined();

    // // Files were imported from the correct location
    // expect(result['index.js']).toContain(`import './_snowpack/pkg/';`);
  });
});
