const plugin = require('../plugin.js');
const path = require('path');

const pathToSassApp = path.join(__dirname, 'fixtures/sass/App.sass');
const pathToSassBase = path.join(__dirname, 'fixtures/sass/base.sass');
const pathToScssApp = path.join(__dirname, 'fixtures/scss/App.scss');
const pathToScssbase = path.join(__dirname, 'fixtures/scss/base.scss');
const pathToBadCode = path.join(__dirname, 'fixtures/bad/bad.scss');

describe('plugin-sass', () => {


  test('returns the compiled Sass result', async () => {
    const p = plugin(null, {});
    const sassResult = await p.load({filePath: pathToSassApp, isDev: false});
    expect(sassResult).toMatchSnapshot(pathToSassApp);
    const scssResult = await p.load({filePath: pathToScssApp, isDev: true});
    expect(scssResult).toMatchSnapshot(pathToScssApp);
  });

  test('throws an error when stderr output is returned', async () => {
    const p = plugin(null, {});
    expect(p.load({filePath: pathToBadCode, isDev: false})).rejects.toThrow('Command failed with exit code');
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
    expect(p.load({filePath: pathToSassApp, isDev: false})).rejects.toThrow('EPIPE');
  });
  // test('calls "tsc" when isDev=false', async () => {
  //   const p = plugin();
  //   await p.run({isDev: false, log: jest.fn});
  //   expect(execaFn.mock.calls[0][0]).toMatch('tsc');
  // });
  // test('calls "tsc --watch" when isDev=true', async () => {
  //   const p = plugin();
  //   await p.run({isDev: true, log: jest.fn});
  //   expect(execaFn.mock.calls[0][0]).toMatch('tsc --watch');
  // });
  // test('handles tsc output', async () => {
  //   const logFn = jest.fn();
  //   const p = plugin();
  //   await p.run({isDev: false, log: logFn});
  //   execaResult.stdout.emit('data', Buffer.from('STDOUT_TEST_MESSAGE'));
  //   execaResult.stderr.emit('data', Buffer.from('STDERR_TEST_MESSAGE'));
  //   expect(logFn.mock.calls).toEqual([
  //     ['WORKER_MSG', {level: 'log', msg: 'STDOUT_TEST_MESSAGE'}],
  //     ['WORKER_MSG', {level: 'log', msg: 'STDERR_TEST_MESSAGE'}],
  //   ]);
  // });
  // test('handles tsc clear character messages', async () => {
  //   const logFn = jest.fn();
  //   const p = plugin();
  //   await p.run({isDev: false, log: logFn});
  //   execaResult.stderr.emit('data', Buffer.from('\u001bcTEST_CLEAR_MESSAGE'));
  //   execaResult.stderr.emit('data', Buffer.from('\x1BcTEST_CLEAR_MESSAGE'));
  //   expect(logFn.mock.calls).toEqual([
  //     ['WORKER_RESET', {}],
  //     ['WORKER_MSG', {level: 'log', msg: 'TEST_CLEAR_MESSAGE'}],
  //     ['WORKER_RESET', {}],
  //     ['WORKER_MSG', {level: 'log', msg: 'TEST_CLEAR_MESSAGE'}],
  //   ]);
  // });
});
