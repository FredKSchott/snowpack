const plugin = require('../plugin.js');
const {EventEmitter} = require('events');

jest.mock('execa');
const execa = require('execa');

describe('plugin-run-script', () => {
  const DEFAULT_OPTIONS = {
    cmd: 'CMD',
    watch: '$1 --additional-test-watch-options',
  };
  let execaResult, execaFn;

  beforeEach(() => {
    execa.command.mockClear();
    execaResult = {stderr: new EventEmitter(), stdout: new EventEmitter()};
    execaFn = jest.fn(() => execaResult);
    execa.command = execaFn;
  });

  test('returns the execa command promise', async () => {
    const p = plugin(null, DEFAULT_OPTIONS);
    const result = await p.run({isDev: false, log: jest.fn});
    expect(result).toEqual(result);
  });
  test('calls the given "cmd" command when isDev=false', async () => {
    const p = plugin(null, {cmd: 'CMD'});
    await p.run({isDev: false, log: jest.fn});
    expect(execaFn.mock.calls[0][0]).toMatch('CMD');
  });
  test('calls the given "watch" command when isDev=true', async () => {
    const p = plugin(null, {cmd: 'CMD', watch: '$1 --additional-test-watch-options'});
    await p.run({isDev: true, log: jest.fn});
    expect(execaFn.mock.calls[0][0]).toMatch('CMD --additional-test-watch-options');
  });
  test('handles command output in "stream" mode', async () => {
    const logFn = jest.fn();
    const p = plugin(null, {...DEFAULT_OPTIONS, output: 'stream'});
    await p.run({isDev: false, log: logFn});
    execaResult.stdout.emit('data', Buffer.from('STDOUT_TEST_MESSAGE'));
    execaResult.stderr.emit('data', Buffer.from('STDERR_TEST_MESSAGE'));
    expect(logFn.mock.calls).toEqual([
      ['CONSOLE_INFO', {msg: 'STDOUT_TEST_MESSAGE'}],
      ['CONSOLE_INFO', {msg: 'STDERR_TEST_MESSAGE'}],
    ]);
  });
  test('handles command output in "dashboard" mode', async () => {
    const logFn = jest.fn();
    const p = plugin(null, {...DEFAULT_OPTIONS, output: 'dashboard'});
    await p.run({isDev: false, log: logFn});
    execaResult.stdout.emit('data', Buffer.from('STDOUT_TEST_MESSAGE'));
    execaResult.stderr.emit('data', Buffer.from('STDERR_TEST_MESSAGE'));
    expect(logFn.mock.calls).toEqual([
      ['WORKER_MSG', {level: 'log', msg: 'STDOUT_TEST_MESSAGE'}],
      ['WORKER_MSG', {level: 'log', msg: 'STDERR_TEST_MESSAGE'}],
    ]);
  });
  test('handles clear character output in "dashboard" mode', async () => {
    const logFn = jest.fn();
    const p = plugin(null, {...DEFAULT_OPTIONS, output: 'dashboard'});
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
  test('modify plugin name when specify name', async () => {
    const p = plugin(null, {...DEFAULT_OPTIONS, output: 'dashboard', name: 'test'});
    expect(p.name).toBe('test');
  });
});
