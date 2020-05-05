## Get Started

### Install Snowpack

**Snowpack v2.0 is in early access!** We'll be launching the official 2.0.0 release later this month, but we'd love for you to try it out today. Just don't forget to install `@next` when you install with npm/yarn:

``` bash
# using npm
npm install --save-dev snowpack@next

# using yarn
yarn add --dev snowpack@next
```


Snowpack can also be installed globally via `npm install -g snowpack`. But, we recommend installing locally in every project via `--save-dev`/`--dev`. You can run the Snowpack CLI locally via package.json "scripts", npm's `npx snowpack`, or via `yarn snowpack`.

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
- **More coming soon!** Got a favorite framework that you don't see here? We'd love your help creating new templates for popular tools/frameworks before the official v2.0 launch.

You can also find a full list of unofficial, community plugins by searching the ["csa-template"](https://www.npmjs.com/search?q=keywords%3Acsa-template) keyword on NPM.

<!--
### Tutorial: Starting from Scratch

While CSA is a great all-in-one starter dev environment, you may prefer to learn exactly how it works under the hood. In that case, we have this tutorial that walks you through how you can build your own Create React App -like dev environment with Snowpack and only a few lines of configuration.

**Coming Soon!**
-->

### Migrating an Existing App

Migrating an existing app to Snowpack is generally easy, since Snowpack supports almost every build tools that you're already using today (Babel, PostCSS, etc). If this is your first time using Snowpack you should start with a Create Snowpack App (CSA) template, copy over your "src" & "public" files from your old app, and then run `snowpack dev` to finish up the migration and troubleshoot any remaining issues. 

CSA is a good starting point for existing applications because it has a few common tools (like Babel) built in by default to replicate the full feature set of a traditional bundled app. CSA is also meant to be a drop-in replacement for Create React App, so any existing Create React App project should run with zero changes needed.

If you run into issues, check out our [Advanced Usage](#advanced-usage) section for guides on importing CSS, asset references, and more.
