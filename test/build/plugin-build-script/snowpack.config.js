module.exports = {
  mount: {
    src: '/_dist_',
  },
  plugins: [
    [
      '@snowpack/plugin-build-script',
      {
        input: ['.ts'],
        output: ['.js'],
        cmd: 'babel --filename $FILE --presets @babel/preset-typescript',
      },
    ],
  ],
};
