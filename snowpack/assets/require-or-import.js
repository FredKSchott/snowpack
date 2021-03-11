"use strict";

/**
 * A utility function to use Node's native `require` or dynamic `import` to load CJS or ESM files
 * @param {string} filepath 
 */
module.exports = async function requireOrImport(filepath) {
    return new Promise((resolve, reject) => {
        try {
            let mdl = require(filepath);
            resolve(mdl);
        } catch (e) {
            if (e.code === 'ERR_REQUIRE_ESM') {
                return import(filepath).then(mdl => resolve(mdl.default ? mdl.default : mdl));
            };
            reject(e);
        }
    })
}
