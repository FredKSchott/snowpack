const release = require('./release.cjs');

(async () => {
    await release('esinstall', 'latest', 'patch');
    await release('skypack', 'latest', 'patch');
    await release('snowpack', 'latest', 'patch');
    await release('app-template-blank-typescript', 'latest', 'patch');
    await release('app-template-lit-element', 'latest', 'patch');
    await release('app-template-preact-typescript', 'latest', 'patch');
    await release('app-template-react-typescript', 'latest', 'patch');
    await release('app-template-svelte-typescript', 'latest', 'patch');
    await release('app-template-svelte-typescript', 'latest', 'patch');
    await release('app-template-vue-typescript', 'latest', 'patch');
    await release('plugins/plugin-optimize', 'latest', 'patch');
    await release('plugins/web-test-runner-plugin', 'latest', 'patch');
})();