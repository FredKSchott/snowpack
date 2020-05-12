## Contributions Welcome!

Interested in contributing? We'd love your help!

Our [issue tracker](https://github.com/pikapkg/create-snowpack-app/issues) is always organized with a selection of high-proirity bugs, feature requests, and "help wanted!"/"good first issue" items. For general package troubleshooting and discussions, check out ourr Snowpack [Package Community](https://www.pika.dev/npm/snowpack/discuss) discussion board.

```bash
# Local Setup (we use yarn workspaces to manage dependencies)
git clone ${REPO}
cd ${REPO}
yarn install
```

### Editing an Existing Template

After running `yarn install`, you can test a template by running npm scripts directly inside that template directory.

```
cd templates/app-template-react
yarn start
yarn build
yarn test
```

### Testing an Existing Template

To test with a local copy of Snowpack, you can either use npm/yarn `link` OR just call the local CLI directly (recommended)

```
# Recommended
~/Code/snowpack/pkg/dist-node/index.bin.js install

# Also fine, after messing with npm/yarn link
snowpack install
```

### Creating a New Template

Check the issue tracker / README first to make sure the template has been requested. If not, start a discussion first to make that it fits into the vision for Create Snowpack App and is something that the team is willing to take on the maintainance of going forward.
