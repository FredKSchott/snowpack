const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('env', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'warn';
  });

  it('Should load environment from config', async () => {
    const result = await testFixture(
      {
        env: {
          API_URL: 'TEST',
        },
      },
      {
        'index.js': dedent`
          console.log(import.meta.env['API_URL']);
        `,
      },
    );
    expect(result['_snowpack/env.js']).toContain('export const API_URL = "TEST";');
  });

  // Reports back that SNOWPACK_PUBLIC_MY_ENV_VAR is not set
  it.skip('Should inject env variables into HTML', async () => {
    const result = await testFixture(
      {
        env: {
          SNOWPACK_PUBLIC_MY_ENV_VAR: 'my-var-replacement',
          SNOWPACK_PUBLIC_: 'ignoreme',
        },
      },
      {
        'index.html': dedent`
          <!DOCTYPE html>
          <html
            lang="en"
            data-mode="%MODE%"
            data-public-url="%PUBLIC_URL%"
            data-my-env-var="%SNOWPACK_PUBLIC_MY_ENV_VAR%"
            data-edge-case-test="%SNOWPACK_PUBLIC_%"
            data-undefined="%SNOWPACK_PUBLIC_BUILD_UNDEFINED%"
          >
            <head>
              <meta charset="utf-8" />
              <link rel="icon" href="/favicon.ico" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <meta name="description" content="Web site created using create-snowpack-app" />
              <link rel="stylesheet" type="text/css" href="/index.css" />
              <title>Snowpack App</title>
            </head>
            <body></body>
          </html>
        `,
      },
    );

    expect(result['index.html']).toEqual(expect.stringContaining('lang="en"'));
    expect(result['index.html']).toEqual(expect.stringContaining('data-mode="production"'));
    expect(result['index.html']).toEqual(
      expect.stringContaining('data-my-env-var="my-var-replacement"'),
    );
    expect(result['index.html']).toEqual(
      expect.stringContaining('data-edge-case-test="%SNOWPACK_PUBLIC_%"'),
    );
    expect(result['index.html']).toEqual(
      expect.stringContaining('data-undefined="%SNOWPACK_PUBLIC_BUILD_UNDEFINED%"'),
    );
  });
});
