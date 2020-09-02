# Contributions Welcome!

Interested in contributing? We'd love your help!

If you run into problems or find something confusing, please share it with us in [this discussion](https://github.com/pikapkg/snowpack/discussions/958). A great experience for new contributors is very important to us!

Please note that all activity on the [`pikapkg/snowpack` repository](https://github.com/pikapkg/snowpack) and our [Discord](https://discord.gg/rS8SnRk) is moderated and will be strictly enforced under Snowpack's [Contributor Code of Conduct](CODE_OF_CONDUCT.md).

Our [issue tracker](https://github.com/pikapkg/snowpack/issues) is always organized with a selection of high-priority bugs, feature requests, and ["help wanted!"](https://github.com/pikapkg/snowpack/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)/["good first issue"](https://github.com/pikapkg/snowpack/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) items. For general package troubleshooting and discussions, check out our [Package Community](https://www.pika.dev/npm/snowpack/discuss) discussion board.

## Requirements

You need [yarn](https://classic.yarnpkg.com/en/docs/install) to setup the `snowpack` repository locally on your machine

## Initial setup

```bash
git clone https://github.com/pikapkg/snowpack.git
cd snowpack
yarn
```

## Build after changes

Note: you will see warnings about `__dirname` and `require()` not being "a valid ESM global" when running `yarn build`. You can ignore these warnings.

```bash
yarn build
yarn --force
```

## Run tests

```bash
yarn build
yarn --force
yarn test
```

## Run local snowpack in another project

You can run your local snowpack by path

```bash
yarn build
cd path/to/some-other-project
/path/to/snowpack/pkg/dist-node/index.bin.js dev
```

Or by linking the global `snowpack` library to your local clone

```bash
cd pkg
npm link
cd path/to/some-other-project
snowpack dev
```

## Discussion

[Join the Pika Discord](https://discord.gg/rS8SnRk)
