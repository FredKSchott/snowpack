// How to release many packages at once:
// 1. get a list of what everything is meant to be going out (git diff [LAST RELEASE COMMIT] --stat)
// 2. create the release-all.js script (get the patch vs. minor vs. major for each package going out. ex: git diff [LAST RELEASE COMMIT] plugins/plugin-svelte)
// 3. run `yarn build && yarn bundle`
// 4. run `../release-all.js` (release-all script must be copied outside of the working directory, so that we pass the "clean working directory" check)

const release = require('./release.cjs');

release('esinstall', 'latest', true);
release('skypack', 'latest', true);
release('snowpack', 'latest', true);
release('app-template-blank-typescript', 'latest', true);
release('app-template-lit-element', 'latest', true);
release('app-template-preact-typescript', 'latest', true);
release('app-template-react-typescript', 'latest', true);
release('app-template-svelte-typescript', 'latest', true);
release('app-template-vue-typescript', 'latest', true);
release('plugins/plugin-optimize', 'latest', true);
release('plugins/web-test-runner-plugin', 'latest', true);
