const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('package', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  /* 

  CLI test: test/build/package-workspace
  Reason for skip: Fails locally on mac because it cannot find a file imported by the workspace package despite it existing
  
  Error:

    console.error
    [22:04:41] [esinstall] /Users/---/snowpack/test/build/test-workspace-component/index.mjs
       Import "./Layout" could not be resolved from file.

      69 |         if (lastHistoryItem && lastHistoryItem.val === log) {
      70 |             lastHistoryItem.count++;
    > 71 |         }
         |          ^
      72 |         else {
      73 |             this.history.push({ val: log, count: 1 });
      74 |         }

      at Object.error (snowpack/lib/logger.js:71:17)
      at SnowpackLogger.log (snowpack/lib/logger.js:111:28)
      at SnowpackLogger.error (snowpack/lib/logger.js:161:10)
      at Object.error (snowpack/lib/sources/local-install.js:30:49)
      at Object.onwarn (esinstall/src/index.ts:357:18)
      at Object.onwarn (node_modules/rollup/dist/shared/rollup.js:19559:20)
      at Object.warn (node_modules/rollup/dist/shared/rollup.js:18790:25)
  
  */

  it.skip('Loads workspace module correctly', async () => {
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
      'snowpack.config.js': dedent`
        module.exports = {
          workspaceRoot: '../build',
          plugins: [['@snowpack/plugin-svelte']],
        };
      `,
    });

    expect(result).toMatchSnapshot();
  });
});
