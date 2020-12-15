module.exports = {
  mount: {
    public: '/',
  },
  plugins: [
    [
      '@snowpack/plugin-run-script',
      {
        cmd: 'sass src/css:public/css --no-source-map',
      },
    ],
  ],
};
