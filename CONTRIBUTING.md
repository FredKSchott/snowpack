## Contributions Welcome!

Interested in contributing? We'd love your help!

If you run into problems or find something confusing, please share it with us in [this discussion](https://github.com/pikapkg/snowpack/discussions/958). A great experience for new contributors is very important to us!

Please note that Snowpack is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to abide by its terms.

Our [issue tracker](https://github.com/pikapkg/snowpack/issues) is always organized with a selection of high-priority bugs, feature requests, and ["help wanted!"](https://github.com/pikapkg/snowpack/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)/["good first issue"](https://github.com/pikapkg/snowpack/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) items. For general package troubleshooting and discussions, check out our [Package Community](https://www.pika.dev/npm/snowpack/discuss) discussion board.

```bash
# Local Setup
git clone ${REPO}
yarn
```

```bash
# Build after changes
yarn build
yarn --force
```

```bash
# Check formatting after changed
yarn format
```

```bash
# Run your tests
yarn build
yarn --force
yarn test
```

```bash
# Run snowpack locally by path, in some sibling project
cd ../some-other-project && ../pkg/dist-node/index.bin.js
# Or, link the built package to run anywhere via global CLI
cd pkg && npm link
snowpack
```

### Discussion

[Join the Pika Discord](https://discord.gg/rS8SnRk)
