const path = require('path');
const {setupBuildTest, readFiles} = require('../../test-utils');

const cwd = path.join(__dirname, 'build');

let files = {};

describe('config: alias', () => {
  beforeAll(() => {
    setupBuildTest(__dirname);

    files = readFiles(cwd);
  });

  it('web_modules can be aliased', () => {
    // js
    expect(files['/_dist_/index.js']).toEqual(
      expect.stringContaining(`import {flatten} from '../TEST_WMU/array-flatten.js';`),
    );
    expect(files['/_dist_/index.js']).toEqual(
      expect.stringContaining(`import * as aliasedDep from '../TEST_WMU/array-flatten.js';`),
    );

    // html
    expect(files['/_dist_/index.html']).toEqual(
      expect.stringContaining(`import {flatten} from '../TEST_WMU/array-flatten.js';`),
    );
    expect(files['/_dist_/index.html']).toEqual(
      expect.stringContaining(`import * as aliasedDep from '../TEST_WMU/array-flatten.js';`),
    );

    // css
    expect(files['/_dist_/components/style.css']).toEqual(
      expect.stringContaining(`@import "../../TEST_WMU/css-package-a/style.css";`),
    );
    expect(files['/_dist_/components/style.css']).toEqual(
      expect.stringContaining(`@import "../../TEST_WMU/@css/package-b/style.css";`),
    );
  });

  describe('aliased modules', () => {
    // note: refer to `src/index.html` to see the inputs—they are all different, and will help explain
    // why we‘re testing for almost the same string over and over again here (many different inputs, uniform output)

    const tests = [
      // group 1: standard JS
      {name: '[js] relative import', expected: `import sort from './sort.js';`},
      {name: '[js] absolute import', expected: `import sort_ from './sort.js';`},
      {name: '[js] bare import using alias', expected: `import sort__ from './sort.js';`},
      {
        name: '[js] bare import using alias + extension',
        expected: `import sort___ from './sort.js';`,
      },

      // group 2: special extension (.svelte)
      {
        name: '[svelte] plugin-provided file extension',
        expected: `import svelteFile from './foo.svelte.js';`,
      },
      {
        name: '[svelte] plugin-provided, missing file extension',
        expected: `import svelteFile_ from './foo.svelte.js';`,
      },
      // { name: '[svelte] absolute URL, plugin-provided file extension',expected: `import svelteFile__ from './foo.js';`}, // TODO: fix!
      // { name: '[svelte] absolute URL, missing file extension', expected: `import svelteFile___ from './foo.js';`, }, // TODO: fix!

      // group 3: auto-resolving index tests
      {
        name: '[index] relative import',
        expected: `import components from './components/index.js';`,
      },
      {
        name: '[index] relative import with index appended',
        expected: `import components_ from './components/index.js';`,
      },
      {
        name: '[index] relative import with index + extension',
        expected: `import components__ from './components/index.js';`,
      },
      {
        name: '[index] bare import using alias',
        expected: `import components___ from './components/index.js';`,
      },
      {
        name: '[index] bare import using alias and index appended',
        expected: `import components____ from './components/index.js';`,
      },
      {
        name: '[index] bare import using alias and index.js appended',
        expected: `import components_____ from './components/index.js'`,
      },

      // group 4: non-JS assets
      {
        name: '[asset] relative import',
        expected: `import styles from './components/style.css.proxy.js';`,
      },
      {
        name: '[asset] absolute import',
        expected: `import styles_ from './components/style.css.proxy.js';`,
      },
      {
        name: '[asset] relative import 2',
        expected: `import robotsTxtRef from '../robots.txt.proxy.js';`,
      },
      {
        name: '[asset] absolute import 2',
        expected: `import robotsTxtRef_ from '../robots.txt.proxy.js';`,
      },
    ];

    tests.forEach((t) => {
      it(t.name, () => {
        expect(files['/_dist_/index.html']).toEqual(expect.stringContaining(t.expected));
      });
    });
  });
});
