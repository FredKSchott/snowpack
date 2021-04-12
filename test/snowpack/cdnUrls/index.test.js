const {testFixture} = require('../../fixture-utils');
const dedent = require('dedent');

describe('cdnUrls', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Preserves CDN URLs in HTML', async () => {
    const result = await testFixture(
      {},
      {
        'index.html': dedent`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <link rel="icon" href="/favicon.ico" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <meta name="description" content="Web site created using create-snowpack-app" />
              <link rel="stylesheet" type="text/css" href="/index.css" />
              <title>Snowpack App</title>
            </head>
            <body>
              <div id="root"></div>
              <noscript>You need to enable JavaScript to run this app.</noscript>
              <!-- TEST: Don't break on remote script tags -->
              <script src="https://unpkg.com/browse/preact@10.4.5/dist/preact.js"></script>
              <script type="module" src="/_dist_/index.js"></script>
            </body>
          </html> 
        `,
      },
    );
    expect(result['index.html']).toContain(
      '<script src="https://unpkg.com/browse/preact@10.4.5/dist/preact.js"></script>',
    );
  });

  it('Preserves CDN URLs in JS', async () => {
    const result = await testFixture(
      {},
      {
        'index.jsx': dedent`
          import React from 'https://cdn.skypack.dev/react@^17.0.0';
          import ReactDOM from 'https://cdn.skypack.dev/react-dom@^17.0.0';
          const App = () => <div>I’m an app!</div>;  
          ReactDOM.render(<App />, document.getElementById('root'));
        `,
      },
    );
    expect(result['index.js']).toContain(
      'import React from "https://cdn.skypack.dev/react@^17.0.0";',
    );
    expect(result['index.js']).toContain(
      'import ReactDOM from "https://cdn.skypack.dev/react-dom@^17.0.0";',
    );
  });

  it('Doesn’t install CDN packages locally', async () => {
    const result = await testFixture(
      {},
      {
        'index.jsx': dedent`
          import React from 'https://cdn.skypack.dev/react@^17.0.0';
          import ReactDOM from 'https://cdn.skypack.dev/react-dom@^17.0.0';
          const App = () => <div>I’m an app!</div>; 
          ReactDOM.render(<App />, document.getElementById('root'));
        `,
      },
    );
    expect(result['_snowpack/pkg/react.js']).not.toBeDefined();
    expect(result['_snowpack/pkg/react-dom.js']).not.toBeDefined();
  });
});
