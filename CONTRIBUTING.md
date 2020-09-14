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

The advantages of using Lerna in a monorepo setup means when we run our tests (and even the [create-snowpack-app templates](./create-snowpack-app)), we’re using our local build of Snowpack and not npm’s published version. After all, if we had to publish to npm in order to test anything, that would be a bad experience for everyone!

When we run `yarn build`, a binstub is built at `./snowpack/pkg/node-dist/index.bin.js`. This is what runs when you run `snowpack` in your CLI, as well as the thing that runs for all our tests. But say you ran `yarn build && yarn test` (no `yarn --force`), you’d get an error message: `/bin/sh: snowpack: command not found`. That’s because in all our tests and sub-projects it’s not enough for that to exist; that has to be symlinked inside every sub-project to `node_modules/.bin/snowpack` (again, because we want to use a local build and not npm’s version). `yarn` is the quickest way to symlink everything, however, `yarn --force` is required at this stage when dependencies are already installed. Without that flag Yarn (incorrectly) thinks there’s nothing to do. In other words, `yarn --force` is only needed **one time** as a one-line command to symlink everything for local development, after which only `yarn build` is needed for subsequent changes and rebuilds.

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
