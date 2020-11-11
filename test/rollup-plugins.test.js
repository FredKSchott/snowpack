const {
  rollupPluginStripSourceMapping,
} = require('../esinstall/lib/rollup-plugins/rollup-plugin-strip-source-mapping.js');

describe('snowpack:rollup-plugin-strip-source-mapping', () => {
  const tests = [
    {
      name: 'inline',
      given: `console.log('foo');//# sourceMappingURL=js.map.js`,
      expected: `console.log('foo');`,
    },
    {
      name: 'end of file',
      given: `console.log('foo');
//# sourceMappingURL=js.map.js`,
      expected: `console.log('foo');
`,
    },
    {
      name: 'middle of file',
      given: `console.log('foo');
//# sourceMappingURL=js.map.js
console.log('bar');
  //# sourceMappingURL=js.map.js`,
      expected: `console.log('foo');

console.log('bar');
  `,
    },
    {
      name: 'inside string', // leave alone
      given: `const myString ='//# sourceMappingURL=js.map.js';`,
      expected: `const myString ='//# sourceMappingURL=js.map.js';`,
    },
    {
      name: 'es-module-shim', // leave alone
      given: `    sourceMappingResolved = \`\n//# sourceMappingURL=\` + resolveUrl(sourceMapping.slice(21), load.r);`,
      expected: `    sourceMappingResolved = \`\n//# sourceMappingURL=\` + resolveUrl(sourceMapping.slice(21), load.r);`,
    },
  ];

  const {transform} = rollupPluginStripSourceMapping();

  tests.forEach(({name, given, expected}) => {
    it(name, () => {
      expect(transform(given).code).toBe(expected);
    });
  });
});
