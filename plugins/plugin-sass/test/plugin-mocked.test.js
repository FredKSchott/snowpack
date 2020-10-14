/**
 * This test requires mocks which could disrupt other tests
 */
const path = require('path');
const mockExeca = jest.fn().mockImplementation(() => Promise.resolve({stdout: '', stderr: ''}));
jest.mock('execa', () => (cmd, args) => mockExeca(cmd, args));
const plugin = require('../plugin');

const MOCK_CONFIG = null;
const MOCK_LOAD = {filePath: path.join(__dirname, 'fixtures', 'scss', 'App.scss'), isDev: false};

const tests = [
  {name: 'no options', given: {}, expect: []},
  {
    name: 'string option',
    given: {compilerOptions: {style: 'compressed'}},
    expect: [`--style=compressed`],
  },
  {
    name: 'boolean option',
    given: {compilerOptions: {sourceMaps: false}},
    expect: [`--no-source-maps`],
  },
  {
    name: 'combination',
    given: {compilerOptions: {style: 'compressed', sourceMaps: true}},
    expect: [`--style=compressed`, `--source-maps`],
  },
];

describe('plugin-sass', () => {
  afterEach(() => {
    mockExeca.mockClear(); // clear calls between each test
  });

  tests.forEach((t) => {
    it(t.name, async () => {
      const {load} = plugin(MOCK_CONFIG, t.given);
      await load(MOCK_LOAD);
      // Note: this test assumes execa is only used once in the entire plugin.
      // If execa needs to be used for another purpose, you can filter calls by 'sass' 1st param here
      t.expect.forEach((arg) => {
        expect(mockExeca.mock.calls[0][1]).toContain(arg);
      });
    });
  });
});
