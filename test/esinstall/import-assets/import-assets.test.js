const path = require('path');
const {runTest} = require('../esinstall-test-utils.js');

const tests = [
  {name: 'css', given: 'css.css'},
  {name: 'jpg', given: 'jpg.jpg'},
  {name: 'json', given: 'json.json'},
  {name: 'svg', given: 'svg.svg'},
];

describe('import-assets', () => {
  tests.forEach((t) => {
    it(t.name, async () => {
      const dest = path.join(__dirname, `test-${t.name}`);

      // import the file directly
      const spec = `mock-pkg-install-assets/${t.given}`;

      // run it through esinstall
      const {
        importMap: {imports},
      } = await runTest([spec], {cwd: __dirname, dest});

      // test that esinstall completed successfully
      expect(imports[spec]).toBeTruthy();
    });
  });
});
