# Contributions Welcome!

Interested in contributing? We'd love your help!

If you run into problems or find something confusing, please share it with us in [this discussion](https://github.com/pikapkg/snowpack/discussions/958). A great experience for new contributors is very important to us!

Please note that all activity on the [`pikapkg/snowpack` repository](https://github.com/pikapkg/snowpack) and our [Discord](https://discord.gg/rS8SnRk) is moderated and will be strictly enforced under Snowpack's [Contributor Code of Conduct](CODE_OF_CONDUCT.md).

Our [issue tracker](https://github.com/pikapkg/snowpack/issues) is always organized with a selection of high-priority bugs, feature requests, and ["help wanted!"](https://github.com/pikapkg/snowpack/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)/["good first issue"](https://github.com/pikapkg/snowpack/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) items. For general package troubleshooting and discussions, check out our [Package Community](https://www.pika.dev/npm/snowpack/discuss) discussion board.

## Requirements

Snowpack uses [yarn workspaces](https://classic.yarnpkg.com/) to manage multiple packages contained in this repository. To contribute, [make sure that you have Yarn installed on your machine](https://classic.yarnpkg.com/en/docs/install).

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
yarn --force # only needed after very first build; afterward can be skipped
```

#### Why is `yarn --force` needed?

Lerna allows us to use our local build of Snowpack which is key for testing any changes we make. Thanks to Lerna, when we run `yarn build`, the `snowpack` [executable script](https://docs.npmjs.com/files/package.json#bin) is built at `./snowpack/pkg/node-dist/index.bin.js`. The `--force` command generates the symlinks needed so that this new executable script gets used by all parts of the project. Now when you run tests in [create-snowpack-app templates](./create-snowpack-app), it knows to use the locally built symlinked version. This solves two major problems: it means you don't have tons of `node_modules` in subdirectories and also means you don’t need to publish Snowpack to npm to test your changes.

## Run tests

```bash
yarn build
yarn --force
yarn test
```

You can filter the tests that are being run using Jest's [`--testNamePattern`](https://jestjs.io/docs/en/cli#--testnamepatternregex) (alias: `-t`) CLI option. You can ignore the `123 snapshots obsolete` messages.

```bash
yarn test --testNamePattern treeshake
```

## Run local snowpack in another project

You can run your local snowpack by path

```bash
yarn build
cd path/to/some-other-project
/path/to/snowpack/pkg/dist-node/index.bin.js dev --verbose --reload
```

Or by linking the global `snowpack` library to your local clone

```bash
cd pkg
npm link
cd path/to/some-other-project
snowpack dev --verbose --reload
```

The `--verbose` flag enables additional logs which will help to identify the source of a problem. The `--reload` will clear the local cache which might have been created by a different `snowpack` version. Learn more about [Snowpack's CLI flags](https://www.snowpack.dev/#cli-flags).

## Discussion

[Join the Pika Discord](https://discord.gg/rS8SnRk)
