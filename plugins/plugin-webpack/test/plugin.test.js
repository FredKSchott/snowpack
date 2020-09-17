const path = require('path');
const fs = require('fs');

const plugin = require('../plugin');

test('minimal - no options', async () => {
  const pluginInstance = plugin({
    buildOptions: {},
  });

  fs.writeFileSync = jest.fn();
  fs.writeFile = jest.fn().mockImplementation((...args) => {
    const callback = args.pop();
    callback();
  });
  console.log = jest.fn();

  await pluginInstance.optimize({
    buildDirectory: path.resolve(__dirname, 'stubs/minimal/'),
  });

  expect(fs.writeFileSync.mock.calls.map(toPathAndStringContent)).toMatchSnapshot(
    'fs.writeFileSync calls',
  );
  expect(fs.writeFile.mock.calls.map(toPathAndStringContent)).toMatchSnapshot('fs.writeFile calls');
  expect(console.log).toMatchSnapshot('console.log calls');
});

function toPathAndStringContent([path, content]) {
  return [path.replace(process.cwd(), ''), content.toString()];
}
