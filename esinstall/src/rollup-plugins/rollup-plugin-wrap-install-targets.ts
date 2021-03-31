import fs from 'fs';
import path from 'path';
import {Plugin} from 'rollup';
import execa from 'execa';
import {VM as VM2} from 'vm2';
import {AbstractLogger, InstallTarget} from '../types';
import {getWebDependencyName, isJavaScript, isRemoteUrl, isTruthy} from '../util';
import isValidIdentifier from 'is-valid-identifier';
import resolve from 'resolve';

// Use CJS intentionally here! ESM interface is async but CJS is sync, and this file is sync
const {parse} = require('cjs-module-lexer');

function isValidNamedExport(name: string): boolean {
  return name !== 'default' && name !== '__esModule' && isValidIdentifier(name);
}

// Add popular CJS/UMD packages here that use "synthetic" named imports in their documentation.
// Our scanner can statically scan most packages without an opt-in here, but these packages
// are built oddly, in a way that we can't statically analyze.
const TRUSTED_CJS_PACKAGES = ['chai/index.js', 'events/events.js', 'uuid/index.js'];

// These packages are written so strangely, that our CJS scanner succeeds at scanning the file
// but fails to pick up some export. Add popular packages here to save everyone a bit of
// headache.
// We use "/index.js here to match the official package, but not any ESM aliase packages
// that the user may have installed instead (ex: react-esm).
const UNSCANNABLE_CJS_PACKAGES = ['chai/index.js', 'events/events.js'];

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
  installTargets: InstallTarget[],
  logger: AbstractLogger,
): Plugin {
  const installTargetSummaries: {[loc: string]: InstallTarget} = {};
  const cjsScannedNamedExports = new Map<string, string[]>();

  /**
   * Attempt #1: Static analysis: Lower Fidelity, but faster.
   * Do our best job to statically scan a file for named exports. This uses "cjs-module-lexer", the
   * same CJS export scanner that Node.js uses internally. Very fast, but only works on some modules,
   * depending on how they were build/written/compiled.
   */
  function cjsAutoDetectExportsStatic(filename: string, visited = new Set()): string[] | undefined {
    const isMainEntrypoint = visited.size === 0;
    // Prevent infinite loops via circular dependencies.
    if (visited.has(filename)) {
      return [];
    } else {
      visited.add(filename);
    }
    const fileContents = fs.readFileSync(filename, 'utf8');
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
              cjsAutoDetectExportsStatic(
                resolve.sync(e, {basedir: path.dirname(filename)}),
                visited,
              ),
            )
            .filter(isTruthy),
        );
      }
      // If nothing was detected, return undefined.
      // Otherwise, resolve and flatten all exports into a single array, remove invalid exports.
      const resolvedExports = Array.from(new Set([...exports, ...resolvedReexports])).filter(
        isValidNamedExport,
      );
      return isMainEntrypoint && resolvedExports.length === 0 ? undefined : resolvedExports;
    } catch (err) {
      // Safe to ignore, this is usually due to the file not being CJS.
      logger.debug(`cjsAutoDetectExportsStatic ${filename}: ${err.message}`);
    }
  }

  /**
   * Attempt #2a - Runtime analysis: More powerful, but slower. (trusted code)
   * This function spins off a Node.js process to analyze the most accurate set of named imports that this
   * module supports. If this fails, there's not much else possible that we could do.
   *
   * We consider this "trusted" because it will actually run the package code in Node.js on your machine.
   * Since this is code that you are intentionally bundling into your application, we consider this fine
   * for most users and equivilent to the current security story of Node.js/npm. But, if you are operating
   * a service that runs esinstall on arbitrary code, you should set `process.env.ESINSTALL_UNTRUSTED_ENVIRONMENT`
   * so that this is skipped.
   */
  function cjsAutoDetectExportsRuntimeTrusted(normalizedFileName: string): string[] | undefined {
    // Skip if set to not trust package code (besides a few popular, always-trusted packages).
    if (
      process.env.ESINSTALL_UNTRUSTED_ENVIRONMENT &&
      !TRUSTED_CJS_PACKAGES.includes(normalizedFileName)
    ) {
      return undefined;
    }
    try {
      const {stdout} = execa.sync(
        `node`,
        ['-p', `JSON.stringify(Object.keys(require('${normalizedFileName}')))`],
        {
          cwd: __dirname,
          extendEnv: false,
        },
      );
      const exportsResult = JSON.parse(stdout).filter(isValidNamedExport);
      logger.debug(`cjsAutoDetectExportsRuntime success ${normalizedFileName}: ${exportsResult}`);
      return exportsResult;
    } catch (err) {
      logger.debug(`cjsAutoDetectExportsRuntime error ${normalizedFileName}: ${err.message}`);
    }
  }

  /**
   * Attempt #2b - Sandboxed runtime analysis: More powerful, but slower.
   * This will only work on UMD and very simple CJS files (require not supported).
   * Uses VM2 to run safely sandbox untrusted code (no access no Node.js primitives, just JS).
   * If nothing was detected, return undefined.
   */
  function cjsAutoDetectExportsRuntimeUntrusted(filename: string): string[] | undefined {
    try {
      const fileContents = fs.readFileSync(filename, 'utf8');
      const vm = new VM2({wasm: false, fixAsync: false});
      const exportsResult = Object.keys(
        vm.run('const exports={}; const module={exports}; ' + fileContents + ';; module.exports;'),
      );
      logger.debug(`cjsAutoDetectExportsRuntimeUntrusted success ${filename}: ${exportsResult}`);
      return exports.filter((identifier) => isValidIdentifier(identifier));
    } catch (err) {
      logger.debug(`cjsAutoDetectExportsRuntimeUntrusted error ${filename}: ${err.message}`);
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
        const knownBadPackage = UNSCANNABLE_CJS_PACKAGES.some((p) =>
          normalizedFileLoc.includes(`node_modules/${p}${p.endsWith('.js') ? '' : '/'}`),
        );
        const cjsExports =
          // If we can trust the static analyzer, run that first.
          (!knownBadPackage && cjsAutoDetectExportsStatic(val)) ||
          // Otherwise, run our more powerful, runtime analysis.
          // Attempted trusted first (won't run in untrusted environments).
          cjsAutoDetectExportsRuntimeTrusted(normalizedFileLoc) ||
          cjsAutoDetectExportsRuntimeUntrusted(normalizedFileLoc);
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
