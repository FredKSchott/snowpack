const {getExtensionMatch} = require('../../snowpack/lib/util');

const EMPTY = Buffer.from('');

describe('getExtensionMatch()', () => {
  const TEST_EXTENSION_MAP = {
    '.js': '.EXPECTED_JS',
    '.one.js': '.EXPECTED_ONE_JS',
    '.one.two.js': '.EXPECTED_ONE_TWO_JS',
  };
  const TEST_EXTENSION_MAP_REVERSED = {
    '.one.two.js': '.EXPECTED_ONE_TWO_JS',
    '.one.js': '.EXPECTED_ONE_JS',
    '.js': '.EXPECTED_JS',
  };

  test('matches a basic file extension', () => {
    expect(getExtensionMatch('foo.js', TEST_EXTENSION_MAP)).toEqual('.EXPECTED_JS');
    expect(getExtensionMatch('foo.js', TEST_EXTENSION_MAP_REVERSED)).toEqual('.EXPECTED_JS');
  });

  test('matches a basic file extension with one vanity dot', () => {
    expect(getExtensionMatch('foo.one.js', TEST_EXTENSION_MAP)).toEqual('.EXPECTED_ONE_JS');
    expect(getExtensionMatch('foo.one.js', TEST_EXTENSION_MAP_REVERSED)).toEqual('.EXPECTED_ONE_JS');
  });
  
  test('matches a basic file extension with two vanity dots', () => {
    expect(getExtensionMatch('foo.one.two.js', TEST_EXTENSION_MAP)).toEqual('.EXPECTED_ONE_TWO_JS');
    expect(getExtensionMatch('foo.one.two.js', TEST_EXTENSION_MAP_REVERSED)).toEqual('.EXPECTED_ONE_TWO_JS');
  });

  test('does not match an exact file name', () => {
    expect(getExtensionMatch('.js', TEST_EXTENSION_MAP)).toEqual(undefined);
    expect(getExtensionMatch('.js', TEST_EXTENSION_MAP_REVERSED)).toEqual(undefined);
    expect(getExtensionMatch('.one.js', TEST_EXTENSION_MAP)).toEqual(undefined);
    expect(getExtensionMatch('.one.js', TEST_EXTENSION_MAP_REVERSED)).toEqual(undefined);
    expect(getExtensionMatch('.one.two.js', TEST_EXTENSION_MAP)).toEqual(undefined);
    expect(getExtensionMatch('.one.two.js', TEST_EXTENSION_MAP_REVERSED)).toEqual(undefined);
  });

  test('returns undefined when no match is found', () => {
    expect(getExtensionMatch('foo.one.two.js.css', TEST_EXTENSION_MAP)).toEqual(undefined);
    expect(getExtensionMatch('foo.one.two.css', TEST_EXTENSION_MAP)).toEqual(undefined);
    expect(getExtensionMatch('foo.js.css', TEST_EXTENSION_MAP)).toEqual(undefined);
  });

});
