---
layout: layouts/main.njk
title: Get Started
---

## Quick start

```bash
npx create-snowpack-app new-dir --template @snowpack/app-template-blank
cd new-dir
npm start
```

This uses [our create-snowpack-app](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/cli) template to spin up a working Snowpack app. For a list of other templates available check out the [create-snowpack-app](https://github.com/snowpackjs/snowpack/tree/master/create-snowpack-app/cli) docs.

## Basic commands

Here's a short list of what you can do with Snowpack:

```bash
# Start your dev server, load your site locally
snowpack dev

# Build your site for production
snowpack build

# Build your site, but watch the file system and rebuild when files change.
# Great for local development with your own dev server (ex: Rails)
snowpack build --watch

# See more helpful info
snowpack --help
```

## Install Snowpack from scratch

```bash
# using npm
npm install --save-dev snowpack

# using yarn
yarn add --dev snowpack
```

Snowpack can also be installed globally via `npm install -g snowpack`. But, we recommend installing locally in every project via `--save-dev`/`--dev`. You can run the Snowpack CLI locally via package.json "scripts", npm's `npx snowpack`, or via `yarn snowpack`.
