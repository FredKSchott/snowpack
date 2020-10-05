const plugin = require('../plugin.js');
const {EventEmitter} = require('events');

jest.mock('execa');
const execa = require('execa');

describe('plugin-typescript', () => {
  let execaResult, execaFn;

  beforeEach(() => {
    execa.command.mockClear();
    execaResult = {stderr: new EventEmitter(), stdout: new EventEmitter()};
    execaFn = jest.fn(() => execaResult);
    execa.command = execaFn;
  });

  test('returns the execa command promise', async () => {
    const p = plugin();
    const result = await p.run({isDev: false, log: jest.fn});
    expect(result).toEqual(result);
  });
  test('calls "tsc" when isDev=false', async () => {
    const p = plugin();
    await p.run({isDev: false, log: jest.fn});
    expect(execaFn.mock.calls[0][0]).toMatch('tsc');
  });
  test('calls "tsc --watch" when isDev=true', async () => {
    const p = plugin();
    await p.run({isDev: true, log: jest.fn});
    expect(execaFn.mock.calls[0][0]).toMatch('tsc --watch');
  });
  test('handles tsc output', async () => {
    const logFn = jest.fn();
    const p = plugin();
    await p.run({isDev: false, log: logFn});
    execaResult.stdout.emit('data', Buffer.from('STDOUT_TEST_MESSAGE'));
    execaResult.stderr.emit('data', Buffer.from('STDERR_TEST_MESSAGE'));
    expect(logFn.mock.calls).toEqual([
      ['WORKER_MSG', {level: 'log', msg: 'STDOUT_TEST_MESSAGE'}],
      ['WORKER_MSG', {level: 'log', msg: 'STDERR_TEST_MESSAGE'}],
    ]);
  });
  test('handles tsc clear character messages', async () => {
    const logFn = jest.fn();
    const p = plugin();
    await p.run({isDev: false, log: logFn});
    execaResult.stderr.emit('data', Buffer.from('\u001bcTEST_CLEAR_MESSAGE'));
    execaResult.stderr.emit('data', Buffer.from('\x1BcTEST_CLEAR_MESSAGE'));
    expect(logFn.mock.calls).toEqual([
      ['WORKER_RESET', {}],
      ['WORKER_MSG', {level: 'log', msg: 'TEST_CLEAR_MESSAGE'}],
      ['WORKER_RESET', {}],
      ['WORKER_MSG', {level: 'log', msg: 'TEST_CLEAR_MESSAGE'}],
    ]);
  });
});
