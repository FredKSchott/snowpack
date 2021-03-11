"use strict";

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
            if (e.code === 'ERR_REQUIRE_ESM') {
                return NATIVE_IMPORT(filepath).then(mdl => resolve(mdl.default ? mdl.default : mdl));
            };
            reject(e);
        }
    })
}
