const {generateSRI} = require('../../snowpack/lib/cjs/build/import-sri');

const EMPTY = Buffer.from('');

test('empty buffer with SHA256', () => {
  expect(generateSRI(EMPTY, 'sha256')).toBe('sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=');
});

test('empty buffer with SHA384', () => {
  expect(generateSRI(EMPTY, 'sha384')).toBe(
    'sha384-OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb',
  );
});

test('empty buffer with SHA512', () => {
  expect(generateSRI(EMPTY, 'sha512')).toBe(
    'sha512-z4PhNX7vuL3xVChQ1m2AB9Yg5AULVxXcg/SpIdNs6c5H0NE8XYXysP+DGNKHfuwvY7kxvUdBeoGlODJ6+SfaPg==',
  );
});

test('verify that SHA384 is default SRI hash algorithm', () => {
  expect(generateSRI(EMPTY, 'sha384')).toBe(generateSRI(EMPTY));
});

test('undefined should return empty hash result', () => {
  expect(generateSRI()).toBe(generateSRI(EMPTY));
});
