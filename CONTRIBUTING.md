
## Contributions Welcome!

Interested in contributing? We'd love your help! 

Our [issue tracker](https://github.com/pikapkg/snowpack/issues) is always organized with a selection of high-priority bugs, feature requests, and ["help wanted!"](https://github.com/pikapkg/snowpack/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)/["good first issue"](https://github.com/pikapkg/snowpack/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) items. For general package troubleshooting and discussions, check out our [Package Community](https://www.pika.dev/npm/snowpack/discuss) discussion board.

```bash
# Local Setup
git clone ${REPO}
npm install
```

```bash
# Build after changes
npm run build
```

```bash
# Check formatting after changed
npm run format
```

```bash
# Run your tests
npm test
```

```bash
# Run snowpack locally by path, in some sibling project
cd ../some-other-project && ../pkg/dist-node/index.bin.js 
# Or, link the built package to run anywhere via global CLI
cd pkg && npm link
snowpack
```
