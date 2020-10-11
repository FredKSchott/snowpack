const {install} = require('../esinstall');

// require('prettier/parser-angular')

test('bundleWithEsBuild', async () => {
  const res = await install(['prettier', 'prettier/package.json'], {useEsbuild: true}); // TODO try bundle entrypoints with common stuff
  console.log(res);
});
