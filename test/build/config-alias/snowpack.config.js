module.exports = {
  alias: {
    'aliased-dep': 'array-flatten',
    '@app': './src',
    '@/': './src/',
    '%': '.',
    '@sort': './src/sort.js',
    $public: './public',
  },
  mount: {
    './src': '/_dist_',
    './public': '/',
  },
  buildOptions: {
    baseUrl: 'https://example.com/foo',
    metaUrlPath: '/TEST_WMU/',
  },
  plugins: ['@snowpack/plugin-svelte', './simple-file-extension-change-plugin.js'],
};
