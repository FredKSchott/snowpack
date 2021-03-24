# New Project

> ✨ Bootstrapped with Create Snowpack App (CSA).

## Available Scripts

### npm start

Runs the app in the development mode.
Open http://localhost:8080 to view it in the browser.

The page will reload if you make edits.
You will also see any lint errors in the console.

> In case you use yarn version 2 (berry) and have "file not found" errors in the console.
Typescript does not support yarn 2 folder structure directly (yet).
The workaround is to replace the loading of the typescript plugin in snowpack.config.js with a call to [phpify](https://yarnpkg.com/advanced/pnpify).

```json
plugins: [
  // '@snowpack/plugin-typescript',
  ['@snowpack/plugin-typescript', { tsc: 'yarn pnpify tsc' }],
]
```

Issue: [microsoft/TypeScript#28289](https://github.com/microsoft/TypeScript/issues/28289)

More info: https://medium.com/swlh/getting-started-with-yarn-2-and-typescript-43321a3acdee

### npm run build

Builds a static copy of your site to the `build/` folder.
Your app is ready to be deployed!

**For the best production performance:** Add a build bundler plugin like "@snowpack/plugin-webpack" to your `snowpack.config.js` config file.

### npm test

Launches the application test runner.
Run with the `--watch` flag (`npm test -- --watch`) to run in interactive watch mode.
