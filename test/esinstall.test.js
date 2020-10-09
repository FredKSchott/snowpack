const {install} = require('../esinstall');

test('bundleWithEsBuild', async () => {
  const res = await install(['prettier', 'react-tiny-link', 'react-table'], {}); // TODO try bundle entrypoints with common stuff
  console.log(res);
});
