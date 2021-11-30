const {getExtensionMatch, getPossibleExtensions} = require('../../snowpack/lib/cjs/util');

const EMPTY = Buffer.from('');

describe('getPossibleExtensions()', () => {
  test('returns a Generator object', () => {
    expect(getPossibleExtensions.constructor.name).toEqual('GeneratorFunction');
  });

  test('returns all the possible file extensions, from longest to shortest', () => {
    expect([...getPossibleExtensions('foo')]).toEqual([]);
    expect([...getPossibleExtensions('foo.js')]).toEqual(['.js']);
    expect([...getPossibleExtensions('foo.one.js')]).toEqual(['.one.js', '.js']);
    expect([...getPossibleExtensions('foo.one.two.js')]).toEqual(['.one.two.js', '.two.js', '.js']);
  });
});

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
    expect(getExtensionMatch('foo.js', TEST_EXTENSION_MAP)).toEqual(['.js', '.EXPECTED_JS']);
    expect(getExtensionMatch('foo.js', TEST_EXTENSION_MAP_REVERSED)).toEqual([
      '.js',
      '.EXPECTED_JS',
    ]);
  });

  test('matches any valid URL', () => {
    expect(getExtensionMatch('/foo.one.js', TEST_EXTENSION_MAP)).toEqual([
      '.one.js',
      '.EXPECTED_ONE_JS',
    ]);
    expect(getExtensionMatch('./foo.one.js', TEST_EXTENSION_MAP)).toEqual([
      '.one.js',
      '.EXPECTED_ONE_JS',
    ]);
    expect(getExtensionMatch('../foo.one.js', TEST_EXTENSION_MAP)).toEqual([
      '.one.js',
      '.EXPECTED_ONE_JS',
    ]);
    expect(getExtensionMatch('file:/a/b/foo.one.js', TEST_EXTENSION_MAP)).toEqual([
      '.one.js',
      '.EXPECTED_ONE_JS',
    ]);
    expect(
      getExtensionMatch('file:/a.test-weird-directory/b/foo.one.js', TEST_EXTENSION_MAP),
    ).toEqual(['.one.js', '.EXPECTED_ONE_JS']);
  });

  test('matches a basic file extension with one vanity dot', () => {
    expect(getExtensionMatch('foo.one.js', TEST_EXTENSION_MAP)).toEqual([
      '.one.js',
      '.EXPECTED_ONE_JS',
    ]);
    expect(getExtensionMatch('foo.one.js', TEST_EXTENSION_MAP_REVERSED)).toEqual([
      '.one.js',
      '.EXPECTED_ONE_JS',
    ]);
  });

  test('matches a basic file extension with two vanity dots', () => {
    expect(getExtensionMatch('foo.one.two.js', TEST_EXTENSION_MAP)).toEqual([
      '.one.two.js',
      '.EXPECTED_ONE_TWO_JS',
    ]);
    expect(getExtensionMatch('foo.one.two.js', TEST_EXTENSION_MAP_REVERSED)).toEqual([
      '.one.two.js',
      '.EXPECTED_ONE_TWO_JS',
    ]);
  });

  test('matches file extensions without case sensitivity', () => {
    expect(getExtensionMatch('foo.ONE.two.js', TEST_EXTENSION_MAP)).toEqual([
      '.one.two.js',
      '.EXPECTED_ONE_TWO_JS',
    ]);
    expect(getExtensionMatch('foo.one.TWO.js', TEST_EXTENSION_MAP_REVERSED)).toEqual([
      '.one.two.js',
      '.EXPECTED_ONE_TWO_JS',
    ]);
    expect(getExtensionMatch('foo.ONE.TWO.JS', TEST_EXTENSION_MAP_REVERSED)).toEqual([
      '.one.two.js',
      '.EXPECTED_ONE_TWO_JS',
    ]);
  });

  test('does not match an exact file name', () => {
    expect(getExtensionMatch('.js', TEST_EXTENSION_MAP)).toEqual(undefined);
    expect(getExtensionMatch('.js', TEST_EXTENSION_MAP_REVERSED)).toEqual(undefined);
    expect(getExtensionMatch('.one.js', TEST_EXTENSION_MAP)).toEqual(['.js', '.EXPECTED_JS']);
    expect(getExtensionMatch('.one.js', TEST_EXTENSION_MAP_REVERSED)).toEqual([
      '.js',
      '.EXPECTED_JS',
    ]);
    expect(getExtensionMatch('.one.two.js', TEST_EXTENSION_MAP)).toEqual(['.js', '.EXPECTED_JS']);
    expect(getExtensionMatch('.one.two.js', TEST_EXTENSION_MAP_REVERSED)).toEqual([
      '.js',
      '.EXPECTED_JS',
    ]);
  });

  test('returns undefined when no match is found', () => {
    expect(getExtensionMatch('foo.one.two.js.css', TEST_EXTENSION_MAP)).toEqual(undefined);
    expect(getExtensionMatch('foo.one.two.css', TEST_EXTENSION_MAP)).toEqual(undefined);
    expect(getExtensionMatch('foo.js.css', TEST_EXTENSION_MAP)).toEqual(undefined);
  });
});
