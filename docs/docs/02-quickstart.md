## Get Started

### Install Snowpack

```bash
# using npm
npm install --save-dev snowpack

# using yarn
yarn add --dev snowpack
```

Snowpack can also be installed globally via `npm install -g snowpack`. But, we recommend installing locally in every project via `--save-dev`/`--dev`. You can run the Snowpack CLI locally via package.json "scripts", npm's `npx snowpack`, or via `yarn snowpack`.


### Quick Start

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


### Create Snowpack App (CSA)

The easiest way to get started with Snowpack is via [Create Snowpack App (CSA)](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app). CSA automatically initializes a starter application for you with a pre-configured, Snowpack-powered dev environment.

If you've ever used Create React App, this is a lot like that!

```bash
npx create-snowpack-app new-dir --template [SELECT FROM BELOW] [--use-yarn]
```

### Official App Templates

- [@snowpack/app-template-blank](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-blank)
- [@snowpack/app-template-blank-typescript](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-blank-typescript)
- [@snowpack/app-template-react](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-react)
- [@snowpack/app-template-react-typescript](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-react-typescript)
- [@snowpack/app-template-preact](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-preact)
- [@snowpack/app-template-svelte](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-svelte)
- [@snowpack/app-template-vue](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-vue)
- [@snowpack/app-template-lit-element](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-lit-element)
- [@snowpack/app-template-lit-element-typescript](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-lit-element-typescript)
- [@snowpack/app-template-11ty](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/app-template-11ty)
- **[See all community templates](https://github.com/pikapkg/snowpack/tree/master/create-snowpack-app/cli#featured-community-templates)**

<!--
### Tutorial: Starting from Scratch

While CSA is a great all-in-one starter dev environment, you may prefer to learn exactly how it works under the hood. In that case, we have this tutorial that walks you through how you can build your own Create React App -like dev environment with Snowpack and only a few lines of configuration.

**Coming Soon!**
-->

### Migrating an Existing App

Migrating an existing app to Snowpack is meant to be painless, since Snowpack supports most features and build tools that you're already using today (Babel, PostCSS, etc). If this is your first time using Snowpack you should start with a Create Snowpack App (CSA) template, copy over your "src" & "public" files from your old app, and then run `snowpack dev`, troubleshooting any remaining issues.

CSA is a good starting point for an existing application because it has a few common tools (like Babel) built in by default to replicate the full feature set of a traditional bundled app. CSA is also meant to be a drop-in replacement for Create React App, so any existing Create React App project should run via CSA with zero changes needed.

If you run into issues, search the rest of our docs site for information about importing CSS [from JS](#import-css) and [from CSS](#css-%40import-support), [asset references](#import-images-%26-other-assets), and more.
