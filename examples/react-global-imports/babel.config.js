module.exports = {
  presets: ['@babel/preset-react'],
  plugins: [
    [
      'import-globals',
      {
        React: 'react',
        Component: {moduleName: 'react', exportName: 'Component'},
        PropTypes: {moduleName: 'react', exportName: 'PropTypes'},
        ReactDOM: 'react-dom',
      },
    ],
  ],
};
