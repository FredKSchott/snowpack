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
  devOptions: {
    fallback: '_dist_/index.html',
  },
  buildOptions: {
    baseUrl: 'https://example.com/foo',
    metaUrlPath: '/TEST_WMU/',
  },
  plugins: ['./simple-file-extension-change-plugin.js'],
};
