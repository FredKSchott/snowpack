# Contributions Welcome!

Interested in contributing? We'd love your help!

If you run into problems or find something confusing, please share it with us in [this discussion](https://github.com/snowpackjs/snowpack/discussions/958). A great experience for new contributors is very important to us!

Please note that all activity on the [`snowpackjs/snowpack` repository](https://github.com/snowpackjs/snowpack) and our [Discord](https://discord.gg/rS8SnRk) is moderated and will be strictly enforced under Snowpack's [Contributor Code of Conduct](CODE_OF_CONDUCT.md).

Our [issue tracker](https://github.com/snowpackjs/snowpack/issues) is always organized with a selection of high-priority bugs, feature requests, and ["help wanted!"](https://github.com/snowpackjs/snowpack/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)/["good first issue"](https://github.com/snowpackjs/snowpack/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) items. For general package troubleshooting and discussions, check out our [Package Community](https://www.pika.dev/npm/snowpack/discuss) discussion board.

## Requirements

Snowpack uses [yarn workspaces](https://classic.yarnpkg.com/) to manage multiple packages contained in this repository. To contribute, [make sure that you have Yarn installed on your machine](https://classic.yarnpkg.com/en/docs/install).

## Initial setup

```bash
git clone https://github.com/snowpackjs/snowpack.git
cd snowpack
yarn
```

## Checking out and building a branch

```bash
git checkout some-branch-name
yarn # in case dependencies have changed
yarn build # re-builds all packages
# that's it! Your monorepo is set up and ready to run/test.
```

Optionally, you can run `yarn bundle` after every `yarn build` call to bundle Snowpack into a single JS file. Unless you have a specific reason to be testing the bundled output, you generally never need to run this command locally.

## Build after changes

Some packages in the repo are written in JavaScript, and require no build step. Others (like Snowpack itself) are written in TypeScript, and require a build step to run.

```bash
# Option 1: A one-time build step
yarn build

# Option 2: Start a persistent TypeScript watcher, recompiling on every change
# Recommended for active development, when many changes are required
yarn build:watch
```

## Updating and adding packages

Since this is a monorepo with several packages, if you want to update/add packages in the subrepos like `create-snowpack-app/app-template-11ty` you'll want to run the commands in the target subdirectory like

```bash
cd create-snowpack-app/app-template-vue
yarn add vue@latest
```

## Tests

We recommend running all tests before you submit a PR. Tests will not work unless you have run a build `yarn build`.

### Running tests

From the repository's root folder, run

```bash
yarn build
yarn test
yarn test:dev # might fail on windows, see #1171
```

### Snapshot tests

_Update Dec 2020: we’re working on improving this! Snapshots are now mostly gone from `test/build`, and we’ll be working through `test/esinstall` next. We‘ll wait to finish the work before updating this section, but know that this may become outdated soon._

The way our snapshot tests work is they test Snowpack by building the codebases in `test/build`. You'll almost always have a "failed" snapshot test when you make a contribution because your new change will make the final build different. You'll want to take a new snapshot. To do this run:

```bash
yarn test -u
```

You'll notice this changes the snapshot file. Commit this change and submit it along with your PR.

### Filtering tests

You can filter the tests that are being run using Jest's [`--testNamePattern`](https://jestjs.io/docs/en/cli#--testnamepatternregex) (alias: `-t`) CLI option. You can ignore the `123 snapshots obsolete` messages.

```bash
yarn test --testNamePattern treeshake
```

## Run local snowpack in another project

You can run your local snowpack by path

```bash
yarn build
cd path/to/some-other-project
/path/to/snowpack-repository/snowpack/index.bin.js dev --verbose --reload
```

Or by linking the global `snowpack` library to your local clone

```bash
cd snowpack
npm link
cd path/to/some-other-project
snowpack dev --verbose --reload
```

To test a local version of the CLI tool use

```bash
node /path/to/snowpack-repository/create-snowpack-app/cli [my-new-dir] --template @snowpack/app-template-vue
```

To test a local version of the `create-snowpack-app` templates use

```bash
npx create-snowpack-app [my-new-dir] --template ./path/to/template
```

Note the path must start with must start with a `.` to be considered local

The `--verbose` flag enables additional logs which will help to identify the source of a problem. The `--reload` will clear the local cache which might have been created by a different `snowpack` version. Learn more about [Snowpack's CLI flags](/reference/cli-command-line-interface).

## Pull Request Guidelines

Checkout a topic branch from a base branch, e.g. `main`, and merge back against that branch.

If adding a feature, it probably should have been brought up in a [discussion](https://github.com/snowpackjs/snowpack/discussions) instead before the PR was created.

Some tips for creating your first pull request:

- Provide background for why a PR was created.
- Link to any relevant issues, discussions, or past PRs.
- Add accompanying tests if applicable.
- Ensure all tests have been passed.

## Discussion

[Join the Pika Discord](https://discord.gg/rS8SnRk)
