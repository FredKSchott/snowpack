const { readFileSync } = require('fs');

const cert = readFileSync("./tls/certificate.pem");
const key = readFileSync("./tls/key.pem");

module.exports = {
  devOptions: {
    open: "none",
    secure: { cert, key },
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
