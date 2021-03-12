const fs = require('fs').promises;
const execa = require('execa');

const plugin = require('../plugin');

describe('@snowpack/plugin-build-script', () => {
  beforeEach(() => {
    const execaResult = {
      stdout: 'stdout',
      stderr: '',
      exitCode: 0,
      // Execa is weird, and returns a promise that also has other properties. Fake that here.
      catch: () => {
        return execaResult;
      },
    };
    execa.command = jest.fn().mockName('execa.command').mockReturnValue(execaResult);
    fs.readFile = jest.fn().mockResolvedValue('content');
  });
  test(`README example`, async () => {
    const {load} = plugin(
      {},
      {
        input: ['.tsx'], // files to watch
        output: ['.tsx'], // files to export
        cmd: 'babel --filename $FILE', // cmd to run
      },
    );

    const result = await load({
      filePath: 'path/to/file.tsx',
    });

    expect(execa.command.mock.calls.length).toEqual(1);
    expect(execa.command.mock.calls[0][0]).toEqual('babel --filename path/to/file.tsx');
    expect(result).toStrictEqual({'.tsx': 'stdout'});
  });
});
