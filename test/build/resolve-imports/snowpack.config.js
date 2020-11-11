module.exports = {
  alias: {
    'aliased-dep': 'array-flatten',
    '@app': './src',
    '@/': './src/',
    '%': '.',
    "@sort": "./src/sort.js",
    "$public": "./public"
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
    webModulesUrl: '/TEST_WMU/',
    minify: false,
  },
  plugins: ['./simple-file-extension-change-plugin.js']
};
