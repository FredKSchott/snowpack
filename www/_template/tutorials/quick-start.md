---
layout: layouts/main.njk
title: Quick Start
---

### Install Snowpack

#### npm

```bash
npm install --save-dev snowpack
```

#### yarn

```bash
yarn add --dev snowpack
```

#### pnpm

```bash
pnpm add --save-dev snowpack
```

### Run the Snowpack CLI

Popular package managers support running installed packages via CLI. This prevents you from having to install the package globally just to run it yourself.

```bash
npx snowpack [command]
yarn run snowpack [command]
pnpm run snowpack [command]
```

Throughout our documentation, we'll use `snowpack [command]` to document the CLI. To run this yourself, add the `npx`/`yarn run`/`pnpm run` prefix of the package manager that you used to install Snowpack.

### Serve your project locally

```
snowpack dev
```

This starts the local dev server for development. By default this serves your current working directory to the browser, and will look for an `index.html` file to start. You can customize which directories you want to serve via the ["mount"](/reference/configuration) configuration.

### Build your project

```
snowpack build
```

This builds your project into a static `build/` directory that you can deploy anywhere. You can customize your build via [configuration](/reference/configuration).

### See all options

```
snowpack --help
```

The `--help` flag will display helpful output.
