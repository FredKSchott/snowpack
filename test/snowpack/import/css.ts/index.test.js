const {testFixture} = require('../../../fixture-utils');
const dedent = require('dedent');

describe('css.ts', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('.css.ts and .css.js files are imported properly', async () => {
    const result = await testFixture({
      'globalStyles.css': dedent`
        * { box-sizing: border-box; }
      `,
      'cssModule.module.css': dedent`
        .foo { border: 1px solid hotpink; }
      `,
      'styles.css.ts': dedent`
        export const container = 'container-de42';
      `,
      'shared.css.js': dedent`
        export const shadow = 'shadow-12fb';
      `,
      'index.js': dedent`
        import './globalStyles.css';
        import { foo } './cssModule.module.css';
        import { container } from './styles.css';
        import { shadow } from './shared.css';
        console.log({ container, shadow, foo });
      `,
    });
    expect(result['index.js']).toBeDefined();
    expect(result['globalStyles.css']).toBeDefined();
    expect(result['cssModule.module.css']).toBeDefined();
    expect(result['styles.css.js']).toBeDefined();
    expect(result['shared.css.js']).toBeDefined();

    expect(result['index.js']).toMatchInlineSnapshot(`
      "import './globalStyles.css.proxy.js';
      import { foo } './cssModule.module.css.proxy.js';
      import { container } from './styles.css.js';
      import { shadow } from './shared.css.js';
      console.log({ container, shadow, foo });"
    `);
  });
});
