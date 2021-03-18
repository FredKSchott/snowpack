module.exports = {
  devOptions: {
    open: "none",
    secure: true,
    secureOptions: {
      cert: "./tls/certificate.pem",
      key: "./tls/key.pem"
    }
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
