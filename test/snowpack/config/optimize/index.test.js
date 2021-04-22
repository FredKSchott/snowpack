const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('optimize', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Bundles and optimizes all project files', async () => {
    const result = await testFixture({
      'src/App.css': dedent`
        .App {
            text-align: center;
        }
        .App code {
            background: #FFF3;
            padding: 4px 8px;
            border-radius: 4px;
        }
        .App p {
            margin: 0.4rem;
        }
        .App-logo {
            height: 40vmin;
            pointer-events: none;
        }
        
        @media (prefers-reduced-motion: no-preference) {
          .App-logo {
            animation: App-logo-spin infinite 20s linear;
          }
        }
        
        .App-header {
            background-color: #282c34;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: calc(10px + 2vmin);
            color: white;
        }
        
        .App-link {
            color: #61dafb;
        }
        
        @keyframes App-logo-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `,
      'src/App.jsx': dedent`
        import React, { useState, useEffect } from "react";
        import logo from "./logo.svg";
        import "./App.css";
        
        function App() {
          // Create the count state.
          const [count, setCount] = useState(0);
          // Create the counter (+1 every second).
          useEffect(() => {
            const timer = setTimeout(() => setCount(count + 1), 1000);
            return () => clearTimeout(timer);
          }, [count, setCount]);
          // Return the App component.
          return (
            <div className="App">
              <header className="App-header">
                <img src={logo} className="App-logo" alt="logo" />
                <p>
                  Edit <code>src/App.jsx</code> and save to reload.
                </p>
                <p>
                  Page has been open for <code>{count}</code> seconds.
                </p>
                <p>
                  <a
                    className="App-link"
                    href="https://reactjs.org"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Learn React
                  </a>
                </p>
              </header>
            </div>
          );
        }

        export default App;
      `,
      'src/index.css': dedent`
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        code {
          font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
          monospace;
        }
      `,
      'src/index.jsx': dedent`
        import React from 'react';
        import ReactDOM from 'react-dom';
        import App from './App.jsx';
        import './index.css';
        
        ReactDOM.render(
          <React.StrictMode>
            <App />
          </React.StrictMode>,
          document.getElementById('root'),
        );
        
        // Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
        // Learn more: https://www.snowpack.dev/concepts/hot-module-replacement
        if (import.meta.hot) {
            import.meta.hot.accept();
        }
      `,
      'src/logo.svg': dedent`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 841.9 595.3">
          <g fill="#61DAFB">
            <path d="M666.3 296.5c0-32.5-40.7-63.3-103.1-82.4 14.4-63.6 8-114.2-20.2-130.4a43.8 43.8 0 00-22.4-5.6v22.3c4.6 0 8.3.9 11.4 2.6 13.6 7.8 19.5 37.5 14.9 75.7-1.1 9.4-2.9 19.3-5.1 29.4-19.6-4.8-41-8.5-63.5-10.9a487.8 487.8 0 00-41.6-50c32.6-30.3 63.2-46.9 84-46.9V78c-27.5 0-63.5 19.6-99.9 53.6-36.4-33.8-72.4-53.2-99.9-53.2v22.3c20.7 0 51.4 16.5 84 46.6-14 14.7-28 31.4-41.3 49.9a467 467 0 00-63.6 11c-2.3-10-4-19.7-5.2-29-4.7-38.2 1.1-67.9 14.6-75.8 3-1.8 6.9-2.6 11.5-2.6V78.5c-8.4 0-16 1.8-22.6 5.6-28.1 16.2-34.4 66.7-19.9 130.1-62.2 19.2-102.7 49.9-102.7 82.3 0 32.5 40.7 63.3 103.1 82.4-14.4 63.6-8 114.2 20.2 130.4a44 44 0 0022.5 5.6c27.5 0 63.5-19.6 99.9-53.6 36.4 33.8 72.4 53.2 99.9 53.2 8.4 0 16-1.8 22.6-5.6 28.1-16.2 34.4-66.7 19.9-130.1 62-19.1 102.5-49.9 102.5-82.3zm-130.2-66.7a450.4 450.4 0 01-13.5 39.5 473.3 473.3 0 00-27.5-47.4c14.2 2.1 27.9 4.7 41 7.9zm-45.8 106.5a532.7 532.7 0 01-24.1 38.2 520.3 520.3 0 01-90.2.1 551.2 551.2 0 01-45-77.8 521.5 521.5 0 0144.8-78.1 520.3 520.3 0 0190.2-.1 551.2 551.2 0 0145 77.8 560 560 0 01-20.7 39.9zm32.3-13c5.4 13.4 10 26.8 13.8 39.8a448.8 448.8 0 01-41.2 8 552.4 552.4 0 0027.4-47.8zM421.2 430a412.3 412.3 0 01-27.8-32 619 619 0 0055.3 0c-9 11.7-18.3 22.4-27.5 32zm-74.4-58.9a451.2 451.2 0 01-41-7.9c3.7-12.9 8.3-26.2 13.5-39.5a473.3 473.3 0 0027.5 47.4zM420.7 163c9.3 9.6 18.6 20.3 27.8 32a619 619 0 00-55.3 0c9-11.7 18.3-22.4 27.5-32zm-74 58.9a552.4 552.4 0 00-27.4 47.7c-5.4-13.4-10-26.8-13.8-39.8 13.1-3.1 26.9-5.8 41.2-7.9zm-90.5 125.2c-35.4-15.1-58.3-34.9-58.3-50.6 0-15.7 22.9-35.6 58.3-50.6 8.6-3.7 18-7 27.7-10.1 5.7 19.6 13.2 40 22.5 60.9a473.5 473.5 0 00-22.2 60.6c-9.9-3.1-19.3-6.5-28-10.2zM310 490c-13.6-7.8-19.5-37.5-14.9-75.7 1.1-9.4 2.9-19.3 5.1-29.4 19.6 4.8 41 8.5 63.5 10.9a487.8 487.8 0 0041.6 50c-32.6 30.3-63.2 46.9-84 46.9-4.5-.1-8.3-1-11.3-2.7zm237.2-76.2c4.7 38.2-1.1 67.9-14.6 75.8-3 1.8-6.9 2.6-11.5 2.6-20.7 0-51.4-16.5-84-46.6 14-14.7 28-31.4 41.3-49.9a467 467 0 0063.6-11 280 280 0 015.2 29.1zm38.5-66.7c-8.6 3.7-18 7-27.7 10.1-5.7-19.6-13.2-40-22.5-60.9a473.5 473.5 0 0022.2-60.6c9.9 3.1 19.3 6.5 28.1 10.2 35.4 15.1 58.3 34.9 58.3 50.6-.1 15.7-23 35.6-58.4 50.6zM320.8 78.4z"/>
            <circle cx="420.9" cy="296.5" r="45.7"/>
          </g>
        </svg>
      `,
      'public/index.html': dedent`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <link rel="icon" href="/favicon.ico" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="description" content="Web site created using create-snowpack-app" />
            <title>Snowpack App</title>
          </head>
          <body>
            <div id="root"></div>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <script type="module" src="/dist/index.js"></script>
            <!--
              This HTML file is a template.
              If you open it directly in the browser, you will see an empty page.

              You can add webfonts, meta tags, or analytics to this file.
              The build step will place the bundled scripts into the <body> tag.
            -->
          </body>
        </html>
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          mount: {
            public: {url: '/', static: true},
            src: {url: '/dist'},
          },
          optimize: {
            bundle: true,
            minify: true,
            target: 'es2020',
          },
        };
      `,
    });

    expect(Object.keys(result)).toEqual([
      'dist/index.css',
      'dist/index.js',
      'dist/index.js.map',
      'dist/logo.svg',
      'index.html',
    ]);
  });

  it('Treeshakes imported modules', async () => {
    const result = await testFixture({
      'index.js': dedent`
        // Test: complex comments intermixed with imports
        import def, {
          waterfall,
          /* map, */
          all /* , */,
        } from 'async';
        console.log(def, waterfall, all);
        
        import(/* webpackChunkName: "array-flatten" */ 'array-flatten');   
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          optimize: {
            treeshake: true,
          },
        };
      `,
    });

    expect(result['_snowpack/pkg/array-flatten.js']).toBeDefined();
    expect(result['_snowpack/pkg/async.js']).toBeDefined();
  });

  it('Creates preload links from entrypoints in HTML', async () => {
    const result = await testFixture({
      'public/index.html': dedent`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="description" content="Web site created using create-snowpack-app" />
            <link rel="stylesheet" type="text/css" href="/index.css" />
            <title>Snowpack App</title>
          </head>
          <body>
            <app-root></app-root>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <script type="module" src="/dist/index.js"></script>
          </body>
        </html> 
      `,
      'public/index.css': dedent`
        body {
          background: red;
        }
      `,
      'src/app-root.ts': dedent`
        import './app-root';
      `,
      'src/index.ts': dedent`
        import './app-root';
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          mount: {
            public: { url: '/', static: true },
            src: { url: '/dist' },
          },
          optimize: { preload: true },
        };
      `,
    });

    expect(result['index.html']).toContain('<link rel="modulepreload" href="/dist/index.js">');
    expect(result['index.html']).toContain('<link rel="modulepreload" href="/dist/app-root.js">');
  });
});
