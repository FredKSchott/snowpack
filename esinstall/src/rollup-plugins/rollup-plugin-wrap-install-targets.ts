import fs from 'fs';
import * as colors from 'kleur/colors';
import path from 'path';
import {Plugin} from 'rollup';
import {VM as VM2} from 'vm2';
import {AbstractLogger, InstallTarget} from '../types';
import {getWebDependencyName, isJavaScript, isRemoteUrl, isTruthy} from '../util';

// Use CJS intentionally here! ESM interface is async but CJS is sync, and this file is sync
const {parse} = require('cjs-module-lexer');

/**
 * rollup-plugin-wrap-install-targets
 *
 * How it works:
 * 1. An array of "install targets" are passed in, describing all known imports + metadata.
 * 2. If isTreeshake: Known imports are marked for tree-shaking by appending 'snowpack-wrap:' to the input value.
 * 3. If autoDetectPackageExports match: Also mark for wrapping, and use automatic export detection.
 * 4. On load, we return a false virtual file for all "snowpack-wrap:" inputs.
 *    a. That virtual file contains only `export ... from 'ACTUAL_FILE_PATH';` exports
 *    b. Rollup uses those exports to drive its tree-shaking algorithm.
 *    c. Rollup uses those exports to inform its "namedExports" for Common.js entrypoints.
 */
export function rollupPluginWrapInstallTargets(
  isTreeshake: boolean,
  autoDetectPackageExports: string[],
  installTargets: InstallTarget[],
  logger: AbstractLogger,
): Plugin {
  const installTargetSummaries: {[loc: string]: InstallTarget} = {};
  const cjsScannedNamedExports = new Map<string, string[]>();

  /**
   * Runtime analysis: High Fidelity, but not always successful.
   * `require()` the CJS file inside of Node.js to load the package and detect it's runtime exports.
   * TODO: Safe to remove now that cjsAutoDetectExportsUntrusted() is getting smarter?
   */
  function cjsAutoDetectExportsTrusted(normalizedFileLoc: string): string[] | undefined {
    try {
      const mod = eval('require')(normalizedFileLoc);
      // skip analysis for non-object modules, these can only be the default export.
      if (!mod || mod.constructor !== Object) {
        return;
      }
      // Collect and filter all properties of the object as named exports.
      return Object.keys(mod).filter((imp) => imp !== 'default' && imp !== '__esModule');
    } catch (err) {
      logger.debug(
        `✘ Runtime CJS auto-detection for ${colors.bold(
          normalizedFileLoc,
        )} unsuccessful. Falling back to static analysis. ${err.message}`,
      );
    }
  }

  /**
   * Attempt #2: Static analysis: Lower Fidelity, but safe to run on anything.
   * Get the exports that we scanned originally using static analysis. This is meant to run on
   * any file (not only CJS) but it will only return an array if CJS exports were found.
   */
  function cjsAutoDetectExportsUntrusted(
    filename: string,
    visited = new Set(),
  ): string[] | undefined {
    const isMainEntrypoint = visited.size === 0;
    // Prevent infinite loops via circular dependencies.
    if (visited.has(filename)) {
      return [];
    } else {
      visited.add(filename);
    }
    const fileContents = fs.readFileSync(filename, 'utf-8');
    try {
      // Attempt 1 - CJS: Run cjs-module-lexer to statically analyze exports.
      let {exports, reexports} = parse(fileContents);
      // If re-exports were detected (`exports.foo = require(...)`) then resolve them here.
      let resolvedReexports: string[] = [];
      if (reexports.length > 0) {
        resolvedReexports = ([] as string[]).concat.apply(
          [],
          reexports
            .map((e) =>
              cjsAutoDetectExportsUntrusted(
                require.resolve(e, {paths: [path.dirname(filename)]}),
                visited,
              ),
            )
            .filter(isTruthy),
        );
      }
      // Attempt 2 - UMD: Run the file in a sandbox to dynamically analyze exports.
      // This will only work on UMD and very simple CJS files (require not supported).
      // Uses VM2 to run safely sandbox untrusted code (no access no Node.js primitives, just JS).
      if (isMainEntrypoint && exports.length === 0 && reexports.length === 0) {
        const vm = new VM2({wasm: false, fixAsync: false});
        exports = Object.keys(
          vm.run(
            'const exports={}; const module={exports}; ' + fileContents + ';; module.exports;',
          ),
        );
      }

      // Resolve and flatten all exports into a single array, and remove invalid exports.
      return Array.from(new Set([...exports, ...resolvedReexports])).filter(
        (imp) => imp !== 'default' && imp !== '__esModule',
      );
    } catch (err) {
      // Safe to ignore, this is usually due to the file not being CJS.
      logger.debug(`cjsAutoDetectExportsUntrusted error: ${err.message}`);
    }
  }

  return {
    name: 'snowpack:wrap-install-targets',
    // Mark some inputs for tree-shaking.
    buildStart(inputOptions) {
      const input = inputOptions.input as {[entryAlias: string]: string};
      for (const [key, val] of Object.entries(input)) {
        if (isRemoteUrl(val)) {
          continue;
        }
        if (!isJavaScript(val)) {
          continue;
        }
        const allInstallTargets = installTargets.filter(
          (imp) => getWebDependencyName(imp.specifier) === key,
        );
        const installTargetSummary = allInstallTargets.reduce((summary, imp) => {
          summary.all = summary.all || imp.all;
          summary.default = summary.default || imp.default || imp.all;
          summary.namespace = summary.namespace || imp.namespace || imp.all;
          summary.named = [...(summary.named || []), ...imp.named];
          return summary;
        }, {} as any);
        installTargetSummaries[val] = installTargetSummary;
        const normalizedFileLoc = val.split(path.win32.sep).join(path.posix.sep);
        const isExplicitAutoDetect = autoDetectPackageExports.some((p) =>
          normalizedFileLoc.includes(`node_modules/${p}${p.endsWith('.js') ? '' : '/'}`),
        );
        const cjsExports = isExplicitAutoDetect
          ? cjsAutoDetectExportsTrusted(val)
          : cjsAutoDetectExportsUntrusted(val);
        if (cjsExports && cjsExports.length > 0) {
          cjsScannedNamedExports.set(normalizedFileLoc, cjsExports);
          input[key] = `snowpack-wrap:${val}`;
        }
        if (isTreeshake && !installTargetSummary.all) {
          input[key] = `snowpack-wrap:${val}`;
        }
      }
    },
    resolveId(source) {
      if (source.startsWith('snowpack-wrap:')) {
        return source;
      }
      return null;
    },
    load(id) {
      if (!id.startsWith('snowpack-wrap:')) {
        return null;
      }
      const fileLoc = id.substring('snowpack-wrap:'.length);
      // Reduce all install targets into a single "summarized" install target.
      const installTargetSummary = installTargetSummaries[fileLoc];
      let uniqueNamedExports = Array.from(new Set(installTargetSummary.named));
      const normalizedFileLoc = fileLoc.split(path.win32.sep).join(path.posix.sep);
      const scannedNamedExports = cjsScannedNamedExports.get(normalizedFileLoc);
      if (scannedNamedExports && (!isTreeshake || installTargetSummary.namespace)) {
        uniqueNamedExports = scannedNamedExports || [];
        installTargetSummary.default = true;
      }
      const result = `
        ${installTargetSummary.namespace ? `export * from '${normalizedFileLoc}';` : ''}
        ${
          installTargetSummary.default
            ? `import __pika_web_default_export_for_treeshaking__ from '${normalizedFileLoc}'; export default __pika_web_default_export_for_treeshaking__;`
            : ''
        }
        ${`export {${uniqueNamedExports.join(',')}} from '${normalizedFileLoc}';`}
      `;
      return result;
    },
  };
}
