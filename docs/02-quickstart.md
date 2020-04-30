## Get Started

### Install Snowpack

``` bash
# using npm
npm install --save-dev snowpack

# using yarn
yarn add --dev snowpack
```

Snowpack can also be installed globally on your machine via `npm install -g snowpack`. But, we recommend installing individually in every project via `--save-dev`/`--dev` so that you can better manage your tools across multiple codebases on your machine.

You can run your local copy of Snowpack via package.json "scripts", npm's `npx snowpack`, or via `yarn snowpack`.

### Create Snowpack App (CSA)

The easiest way to get started with Snowpack is via Create Snowpack App (CSA). CSA automatically initializes a starter application for you with an already-configured, Snowpack-powered dev environment. 

If you've ever used Create React App, this is a lot like that!

``` bash
npx create-snowpack-app new-dir --template [SELECT FROM BELOW] [--use-yarn]
```

### Official App Templates

- [@snowpack/app-template-blank](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-blank)
- [@snowpack/app-template-react](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-react)
- [@snowpack/app-template-react-typescript](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-react-typescript)
- [@snowpack/app-template-svelte](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-svelte)
- [@snowpack/app-template-vue](https://github.com/pikapkg/create-snowpack-app/tree/master/templates/app-template-vue)

You can also find a full list of unofficial, community plugins by searching the ["csa-template"](https://www.npmjs.com/search?q=keywords%3Acsa-template) keyword on NPM.

### Tutorial: Recreating CRA from Scratch

While CSA is a great all-in-one starter dev environment, you may prefer to learn exactly how it works under the hood. In that case, we have this tutorial that walks you through how you can build your own Create React App -like dev environment with Snowpack and only a few lines of configuration.

**TODO**


### Migrating an Existing App

To migrate an existing app to Snowpack depends on how many specialized/customized bundler features/plugins you're currently using. Certain bundler plugins lock you in to that specific setup, since your application code can become dependent on certain plugin behaviors.

Your best bet is to start with a Create Snowpack App (CSA) template, copy over your "source" & "public" non-source files from your old app, and then run `snowpack dev` to finish up the migration, troubleshooting any remaining issues. 

CSA is a good starting point for existing applications because it has a few common tools (like Babel) built in by default to replicate the full feature set of a traditional bundled app. CSA is also meant to be a drop-in replacement for Create React App, so any existing Create React App project should run without additional changes.
