const {testFixture} = require('../../fixture-utils');
const dedent = require('dedent');

describe('utf8', () => {
  beforeAll(() => {
    // Needed until we make Snowpack's JS Build Interface quiet by default
    require('snowpack').logger.level = 'error';
  });

  it('Unicode characters are not escaped', async () => {
    const result = await testFixture({
      'index.js': dedent`
        export function getText() {
          return 'testing utf-8 characters: юникод не эскейпится 👌';
        }
        
        document.body.append(getText());
      `,
      'index.html': dedent`
        <!DOCTYPE html>
        <html lang="ru">
          <head>
            <meta charset="utf-8" />
            <title>utf-8 test</title>
            <script src="index.js" type="module" defer></script>
          </head>
          <body>
            <h1>Testing UTF-8: проверка юникода</h1>
          </body>
        </html> 
      `,
      'snowpack.config.js': dedent`
        module.exports = {
          optimize: {
            bundle: true,
            minify: true,
          },
        };
      `,
    });

    // Unicode characters aren't escaped in html
    expect(result['index.html']).toContain('проверка юникода');
    // Unicode characters aren't escaped in typescript
    expect(result['index.js']).toContain('юникод не эскейпится 👌');
  });
});
