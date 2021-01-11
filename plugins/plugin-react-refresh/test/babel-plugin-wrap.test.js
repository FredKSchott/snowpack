const babel = require('@babel/core');

const headerText = `console.log('header');`;
const footerText = `console.log('footer');`;
const contents = `console.log('contents');`;

describe('babel-plugin-wrap', () => {
  it('should wrap contents', async () => {
    const {code, map} = await babel.transformAsync(contents, {
      ast: false,
      compact: false,
      sourceMaps: true,
      configFile: false,
      babelrc: false,
      plugins: [
        [require('../babel-plugin-wrap'), {
          header: headerText,
          footer: footerText
        }]
      ],
    });
    expect(code).toEqual(`console.log('header');\nconsole.log('contents');\nconsole.log('footer');`);
    expect(map).not.toBeUndefined();
  })
})
