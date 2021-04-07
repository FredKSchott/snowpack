const {testFixture} = require('../../fixture-utils');
const dedent = require('dedent');

describe('cssModules', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'warn';
  });

  it('Builds css.proxy.js file from css module import', async () => {
    const result = await testFixture(
      {},
      {
        'index.js': dedent`
          import foo from './App.module.css';
          console.log(foo);
        `,
        'App.module.css': dedent`
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
      },
    );
    expect(result['App.module.css.proxy.js']).toEqual(
      expect.stringMatching(/\._App_[A-Za-z0-9]+_[A-Za-z0-9]+ \{/),
    );
    expect(result['App.module.css.proxy.js']).not.toEqual(expect.stringContaining(`.App {`));
    expect(result['App.module.css']).not.toEqual(expect.stringContaining(`.App {`));
    expect(result['App.module.css.json']).toBeDefined();
  });
});
