const execa = require('execa');

module.exports = function postcssPlugin(snowpackConfig, options) {
  return {
    name: '@snowpack/postcss-transform',
    async transform({fileExt, contents}) {
      const {input = ['.css'], config} = options;
      if (!input.includes(fileExt) || !contents) return;

      const flags = [];
      if (config) flags.push(`--config ${config}`);

      const {stdout} = await execa('postcss', flags, {
        cwd: snowpackConfig.root || process.cwd(),
        input: contents,
      });

      if (stdout) return stdout;
    },
  };
};
