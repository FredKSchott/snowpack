const {install} = require('../esinstall');

// require('prettier/parser-angular')

test('bundleWithEsBuild', async () => {
  const res = await install(
    ['prettier', 'react-tiny-link', 'react-table', 'prettier/package.json'],
    {},
  ); // TODO try bundle entrypoints with common stuff
  console.log(res);
});
