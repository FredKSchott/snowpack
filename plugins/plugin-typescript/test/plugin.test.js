const plugin = require('../plugin.js');
const {EventEmitter} = require('events');

jest.mock('execa');
const execa = require('execa');

describe('plugin-typescript', () => {
  let execaResult, execaFn;

  beforeEach(() => {
    execa.command.mockClear();
    execaResult = {
      stderr: new EventEmitter(),
      stdout: new EventEmitter(),
      // Execa is weird, and returns a promise that also has other properties. Fake that here.
      catch: () => {
        return execaResult;
      },
    };
    execaFn = jest.fn().mockName('execa.command').mockReturnValue(execaResult);
    execa.command = execaFn;
  });

  test('returns the execa command promise', async () => {
    const p = plugin({});
    const result = await p.run({isDev: false, log: jest.fn});
    expect(result).toEqual(execaResult);
  });
  test('calls "tsc" correctly when isDev=false', async () => {
    const p = plugin({});
    await p.run({isDev: false, log: jest.fn});
    expect(execaFn.mock.calls[0][0]).toContain('--noEmit');
    expect(execaFn.mock.calls[0][0]).not.toContain('--watch');
  });
  test('calls "tsc --watch" when isDev=true', async () => {
    const p = plugin({});
    await p.run({isDev: true, log: jest.fn});
    expect(execaFn.mock.calls[0][0]).toContain('--noEmit');
    expect(execaFn.mock.calls[0][0]).toContain('--watch');
  });
  test('calls "tsc" correctly with args', async () => {
    const p = plugin({}, {args: '--foo bar'});
    await p.run({isDev: false, log: jest.fn});
    expect(execaFn.mock.calls[0][0]).toContain('--foo bar');
  });
  test('calls custom tsc command correctly with args', async () => {
    const p = plugin({}, {tsc: 'echo', args: 'Echo message'});
    await p.run({isDev: false, log: jest.fn});
    expect(execaFn.mock.calls[0][0]).toContain('Echo message');
  });
  test('handles tsc output', async () => {
    const logFn = jest.fn();
    const p = plugin({});
    await p.run({isDev: false, log: logFn});
    execaResult.stdout.emit('data', Buffer.from('STDOUT_TEST_MESSAGE'));
    execaResult.stderr.emit('data', Buffer.from('STDERR_TEST_MESSAGE'));
    expect(logFn.mock.calls).toEqual([
      ['WORKER_MSG', {msg: 'STDOUT_TEST_MESSAGE'}],
      ['WORKER_MSG', {msg: 'STDERR_TEST_MESSAGE'}],
    ]);
  });
  test('handles tsc clear character messages', async () => {
    const logFn = jest.fn();
    const p = plugin({});
    await p.run({isDev: false, log: logFn});
    execaResult.stderr.emit('data', Buffer.from('\u001bcTEST_CLEAR_MESSAGE'));
    execaResult.stderr.emit('data', Buffer.from('\x1BcTEST_CLEAR_MESSAGE'));
    expect(logFn.mock.calls).toEqual([
      ['WORKER_RESET', {}],
      ['WORKER_MSG', {msg: 'TEST_CLEAR_MESSAGE'}],
      ['WORKER_RESET', {}],
      ['WORKER_MSG', {msg: 'TEST_CLEAR_MESSAGE'}],
    ]);
  });
});
