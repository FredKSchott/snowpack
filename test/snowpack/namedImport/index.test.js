const {testFixture} = require('../../fixture-utils');
const dedent = require('dedent');

describe('namedImport', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  // if this file built successfully, then the import worked
  it('correctly uses named import', async () => {
    const result = await testFixture(
      {},
      dedent`
        import {flatten as _$v4} from 'array-flatten';
        _$v4([1, 2, [3, 4]]);
      `,
    );
    expect(result['_snowpack/pkg/array-flatten.js']).toBeDefined();
    expect(result).toMatchSnapshot();
  });
});
