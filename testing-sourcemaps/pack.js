const snowpack = require('snowpack');

snowpack.logger.level = 'info';

const build = async () => {
  const config = await snowpack.loadConfiguration();
  await snowpack.startServer({config});

  // await snowpack.build({
  //   config,
  //   lockfile: null,
  // });
};

build();
