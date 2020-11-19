---
layout: layouts/main.njk
title: SSL Certificates
---

## Generating SSL Certificates

You can automatically generate credentials for your project via either:

- [devcert (no install required)](https://github.com/davewasmer/devcert-cli): `npx devcert-cli generate localhost`
- [mkcert (install required)](https://github.com/FiloSottile/mkcert): `mkcert -install && mkcert -key-file snowpack.key -cert-file snowpack.crt localhost`

In most situations you should add personally generated certificate files (`snowpack.key` and `snowpack.crt`) to your `.gitignore` file.
