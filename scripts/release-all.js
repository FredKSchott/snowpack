
// How to release many packages at once:
// 1. get a list of what everything is meant to be going out (git diff [LAST RELEASE COMMIT] --stat)
// 2. create the release-all.js script (get the patch vs. minor vs. major for each package going out. ex: git diff [LAST RELEASE COMMIT] plugins/plugin-svelte)
// 3. run `yarn build && yarn bundle`
// 4. run `../release-all.js` (release-all script must be copied outside of the working directory, so that we pass the "clean working directory" check)

const release = require('./release.cjs');

release('esinstall', 'latest', 'patch'. true);
release('skypack', 'latest', 'patch'. true);
release('snowpack', 'latest', 'patch'. true);
release('app-template-blank-typescript', 'latest', 'patch'. true);
release('app-template-lit-element', 'latest', 'patch'. true);
release('app-template-preact-typescript', 'latest', 'patch'. true);
release('app-template-react-typescript', 'latest', 'patch'. true);
release('app-template-svelte-typescript', 'latest', 'patch'. true);
release('app-template-svelte-typescript', 'latest', 'patch'. true);
release('app-template-vue-typescript', 'latest', 'patch'. true);
release('plugins/plugin-optimize', 'latest', 'patch'. true);
release('plugins/web-test-runner-plugin', 'latest', 'patch'. true);