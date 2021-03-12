module.exports = {
  devOptions: {
    open: "none"
  },
  mount: {
    public: "/",
    src: "/_dist_"
  },
  plugins: [
    [
      '@snowpack/plugin-build-script',
      {
        input: ['.tmpl'],
        output: ['.html'],
        cmd: 'cat $FILE',
      },
    ],
  ],
};
