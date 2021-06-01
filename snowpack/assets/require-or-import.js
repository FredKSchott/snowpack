"use strict";
const { pathToFileURL } = require('url');
const NATIVE_REQUIRE = eval('require');
const NATIVE_IMPORT = (filepath) => import(filepath);
const r = require('resolve');

/**
 * A utility function to use Node's native `require` or dynamic `import` to load CJS or ESM files
 * @param {string} filepath 
 */
module.exports = async function requireOrImport(filepath, { from = process.cwd() } = {}) {
    return new Promise((resolve, reject) => {
        // Resolve path based on `from`
        const resolvedPath = r.sync(filepath, {
            basedir: from
        });
        try {
          const mdl = NATIVE_REQUIRE(resolvedPath);
          resolve(mdl);
        } catch (e) {
          if (e instanceof SyntaxError && /export|import/.test(e.message)) {
            console.error(`Failed to load "${filepath}"!\nESM format is not natively supported in "node@${process.version}".\nPlease use CommonJS or upgrade to an LTS version of node above "node@12.17.0".`)
          } else if (e.code === 'ERR_REQUIRE_ESM') {
              const url = pathToFileURL(resolvedPath);
              return NATIVE_IMPORT(url).then(mdl => resolve(mdl.default ? mdl.default : mdl));
          };
          try {
            return NATIVE_IMPORT(pathToFileURL(resolvedPath)).then(mdl => resolve(mdl.default ? mdl.default : mdl));
          } catch (e) {
            reject(e);  
          }
        }
    })
}
