const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('json', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Imports JSON files correctly', async () => {
    const result = await testFixture(
      {},
      {
        'packages/json-test-pkg/file.json': dedent`
          {"test-json-pkg": true}
        `,
        'packages/json-test-pkg/package.json': dedent`
          {
            "name": "json-test-pkg",
            "version": "0.1.0"
          }        
        `,
        'file.json': dedent`
          {"test": true}
        `,
        'index.js': dedent`
          import testJsonData from './file.json';
          import testJsonPkgData from 'json-test-pkg/file.json';
          console.log('loaded:', testJsonData, testJsonPkgData);
        `,
        'package.json': dedent`
          {
            "private": true,
            "version": "1.0.1",
            "name": "@snowpack/test-import-json",
            "dependencies": {
              "json-test-pkg": "file:./packages/json-test-pkg"
            }
          }
        `,
      },
    );
    expect(result).toMatchSnapshot();
  });
});
