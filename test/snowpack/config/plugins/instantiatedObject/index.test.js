const {testFixture} = require('../../../../fixture-utils');
const dedent = require('dedent');

class Instantiable {
  constructor() {
    this.prop = true;
  }

  method() {}
}

const instance = new Instantiable();

describe('instantiatedObject', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Instantiated objects do not affect build', async () => {
    const result = await testFixture(
      {
        plugins: [['./dummy-plugin.js', {instance}]],
      },
      {
        'index.js': dedent`
          console.log('fooey');
        `,
        'dummy-plugin.js': dedent`
          module.exports = (snowpackConfig, {instance}) => {
            if (!instance.prop) {
              throw new Error("simple prop value didn't make it");
            }
          
            if (!instance.method) {
              throw new Error("method value didn't make it");
            }
          
            return {name: 'dummy-plugin'};
          };
        `,
      },
    );
    expect(result['index.js']).toMatchSnapshot();
  });
});
