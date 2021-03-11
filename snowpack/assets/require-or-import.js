"use strict";
const { pathToFileURL } = require('url');
const NATIVE_REQUIRE = eval('require');
const NATIVE_IMPORT = (filepath) => import(filepath);

/**
 * A utility function to use Node's native `require` or dynamic `import` to load CJS or ESM files
 * @param {string} filepath 
 */
module.exports = async function requireOrImport(filepath) {
    return new Promise((resolve, reject) => {
        try {
            let mdl = NATIVE_REQUIRE(filepath);
            resolve(mdl);
        } catch (e) {
            if (e instanceof SyntaxError && /export|import/.test(e.message)) {
              console.error(`Failed to load "${filepath}"!\nESM format is not natively supported in "node@${process.version}".\nPlease use CommonJS or upgrade to an LTS version of node above "node@12.17.0".`)
            } else if (e.code === 'ERR_REQUIRE_ESM') {
                const url = pathToFileURL(filepath);
                return NATIVE_IMPORT(url).then(mdl => resolve(mdl.default ? mdl.default : mdl));
            };
            reject(e);
        }
    })
}
