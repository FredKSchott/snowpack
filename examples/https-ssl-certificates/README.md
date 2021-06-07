---
layout: ../../main.njk
title: SSL Certificates
---

```
npm start -- --secure
```

Snowpack provides an easy way to use a local HTTPS server during development through the use of the `--secure` flag.

When enabled, Snowpack will create an HTTPS server with HTTP2 support enabled using either:

  - (default) the `snowpack.key` and `snowpack.crt` file in the root directory of your site
  - (if provided) the TLS certificate and private key files at the paths specified in `devOptions.secure.cert` and `devOptions.secure.key` in the Snowpack configuration.

## Generating SSL Certificates

You can automatically generate credentials for your project via either:

- [devcert (no install required)](https://github.com/davewasmer/devcert-cli): `npx devcert-cli generate localhost`
- [mkcert (install required)](https://github.com/FiloSottile/mkcert): `mkcert -install && mkcert -key-file snowpack.key -cert-file snowpack.crt localhost`

In most situations you should add personally generated certificate files (`snowpack.key` and `snowpack.crt`) to your `.gitignore` file.
