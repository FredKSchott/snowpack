'use strict';
const {pathToFileURL} = require('url');
const NATIVE_REQUIRE = eval('require');
const NATIVE_IMPORT = (filepath) => import(filepath);
const r = require('resolve');

/**
 * A utility function to use Node's native `require` or dynamic `import` to load CJS or ESM files
 * @param {string} filepath
 */
module.exports = async function requireOrImport(filepath, {from = process.cwd()} = {}) {
  return new Promise((resolve, reject) => {
    if (filepath.startsWith('node:')) {
      return NATIVE_IMPORT(filepath).then(
        (mdl) => resolve(mdl),
        (err) => reject(err),
      );
    }

    // Resolve path based on `from`
    const resolvedPath = r.sync(filepath, {
      basedir: from,
    });
    try {
      const mdl = NATIVE_REQUIRE(resolvedPath);

      // Add a `default` property on a CommonJS export so that it can be accessed from import statements.
      // This is set to enumerable: false to make it hidden(ish) to code.
      if (mdl && !('default' in mdl)) {
        Object.defineProperty(mdl, 'default', {
          configurable: true,
          enumerable: false,
          writable: true,
          value: mdl,
        });
      }

      resolve(mdl);
    } catch (e) {
      if (e instanceof SyntaxError && /export|import/.test(e.message)) {
        console.error(
          `Failed to load "${filepath}"!\nESM format is not natively supported in "node@${process.version}".\nPlease use CommonJS or upgrade to an LTS version of node above "node@12.17.0".`,
        );
      } else if (e.code === 'ERR_REQUIRE_ESM') {
        const url = pathToFileURL(resolvedPath);
        return NATIVE_IMPORT(url).then(
          (mdl) => resolve(mdl.default ? mdl.default : mdl),
          (err) => reject(err),
        );
      }
      try {
        return NATIVE_IMPORT(pathToFileURL(resolvedPath)).then(
          (mdl) => resolve(mdl.default ? mdl.default : mdl),
          (err) => reject(err),
        );
      } catch (e) {
        reject(e);
      }
    }
  });
};
