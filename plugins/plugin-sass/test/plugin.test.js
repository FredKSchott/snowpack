const plugin = require('../plugin.js');
const path = require('path');

const pathToSassApp = path.join(__dirname, 'fixtures/sass/App.sass');
const pathToSassBase = path.join(__dirname, 'fixtures/sass/base.sass');
const pathToScssApp = path.join(__dirname, 'fixtures/scss/App.scss');
const pathToBadCode = path.join(__dirname, 'fixtures/bad/bad.scss');

describe('plugin-sass', () => {
  test('returns the compiled Sass result', async () => {
    const p = plugin(null, {});
    const sassResult = await p.load({filePath: pathToSassApp, isDev: false});
    expect(sassResult).toMatchSnapshot('App.sass');
    const scssResult = await p.load({filePath: pathToScssApp, isDev: true});
    expect(scssResult).toMatchSnapshot('App.scss');
  });

  test('throws an error when stderr output is returned', async () => {
    const p = plugin(null, {});
    await expect(p.load({filePath: pathToBadCode, isDev: false})).rejects.toThrow(
      'Command failed with exit code',
    );
  });

  test('marks a dependant as changed when an imported changes and isDev=true', async () => {
    const p = plugin(null, {});
    p.markChanged = jest.fn();
    await p.load({filePath: pathToSassApp, isDev: true});
    expect(p.markChanged.mock.calls).toEqual([]);
    p.onChange({filePath: pathToSassApp});
    expect(p.markChanged.mock.calls).toEqual([]);
    p.onChange({filePath: pathToSassBase});
    expect(p.markChanged.mock.calls).toEqual([[pathToSassApp]]);
  });

  test('does not track dependant changes when isDev=false', async () => {
    const p = plugin(null, {});
    p.markChanged = jest.fn();
    await p.load({filePath: pathToSassApp, isDev: false});
    p.onChange({filePath: pathToSassApp});
    p.onChange({filePath: pathToSassBase});
    expect(p.markChanged.mock.calls).toEqual([]);
  });

  test('uses native sass CLI when native option = true', async () => {
    const p = plugin(null, {native: true});
    process.env.PATH = '';
    await expect(p.load({filePath: pathToSassApp, isDev: false})).rejects.toThrow(/(EPIPE|ENOENT)/);
  });
});
