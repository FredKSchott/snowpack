import fs from 'fs';
import * as colors from 'kleur/colors';
import path from 'path';
import {VM as VM2} from 'vm2';
import {AbstractLogger, InstallTarget} from '../types';
import {getWebDependencyName, isJavaScript, isRemoteUrl, isTruthy, NATIVE_REQUIRE} from '../util';
import isValidIdentifier from 'is-valid-identifier';
import {init as initESModuleLexer, parse as parseEsm} from 'es-module-lexer';

// Use CJS intentionally here! ESM interface is async but CJS is sync, and this file is sync
const {parse: parseCjs} = require('cjs-module-lexer');

/**
 * Runtime analysis: High Fidelity, but not always successful.
 * `require()` the CJS file inside of Node.js to load the package and detect it's runtime exports.
 * TODO: Safe to remove now that cjsAutoDetectExportsUntrusted() is getting smarter?
 */
function cjsAutoDetectExportsTrusted(
  normalizedFileLoc: string,
  logger: AbstractLogger,
): string[] | undefined {
  try {
    const mod = NATIVE_REQUIRE(normalizedFileLoc);
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
  logger: AbstractLogger,
  visited = new Set(),
): string[] | undefined {
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
    let {exports, reexports} = parseCjs(fileContents);
    // If re-exports were detected (`exports.foo = require(...)`) then resolve them here.
    let resolvedReexports: string[] = [];
    if (reexports.length > 0) {
      resolvedReexports = ([] as string[]).concat.apply(
        [],
        reexports
          .map((e) =>
            cjsAutoDetectExportsUntrusted(
              require.resolve(e, {paths: [path.dirname(filename)]}),
              logger,
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
        vm.run('const exports={}; const module={exports}; ' + fileContents + ';; module.exports;'),
      );

      // Verify that all of these are valid identifiers. Otherwise when we attempt to
      // reexport it will produce invalid js like `import { a, b, 0, ) } from 'foo';
      const allValid = exports.every((identifier) => isValidIdentifier(identifier));
      if (!allValid) {
        exports = [];
      }
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

function parseEntrypoint(entry: string, isExplicitAutoDetect: boolean, logger: AbstractLogger) {
  const entryContent = fs.readFileSync(entry, 'utf8');
  const [parsedEsmImports, parsedEsmExports] = parseEsm(entryContent);
  if (parsedEsmImports.length > 0 || parsedEsmExports.length > 0) {
    return {
      format: 'esm',
      named: parsedEsmExports.filter((exp) => exp !== 'default'),
      default: parsedEsmExports.includes('default'),
    };
  }
  const scannedNamedExports = isExplicitAutoDetect
    ? cjsAutoDetectExportsTrusted(entry, logger)
    : cjsAutoDetectExportsUntrusted(entry, logger);

  if (!scannedNamedExports) {
    return {
      format: 'esm',
      named: [],
      default: false,
    };
  }
  return {
    format: 'cjs',
    named: scannedNamedExports,
    default: true,
  };
}

// const esmInstallTargetSummary = {
//   specifier: entry,
//   all: true,
//   default: parsedEsmExports.includes('default'),
//   namespace: parsedEsmExports.length > 1 || parsedEsmExports[0] !== 'default',
//   named: [],
// };
// }

// const scannedNamedExports = isExplicitAutoDetect
//   ? cjsAutoDetectExportsTrusted(val, logger)
//   : cjsAutoDetectExportsUntrusted(val, logger);
// console.log(
//   val,
//   scannedNamedExports && scannedNamedExports.length > 0,
//   isTreeshake && !installTargetSummary.all,
// );

// function generateInstallTargetSummary(
//   entry: string,
//   installTargets: InstallTarget[],
//   isTreeshake: boolean,
//   isExplicitAutoDetect: boolean,
//   logger: AbstractLogger,
// ) {
//   if (isTreeshake) {
//     return installTargets
//       .filter((imp) => imp.specifier === entry)
//       .reduce((summary, imp) => {
//         summary.all = summary.all || imp.all;
//         summary.default = summary.default || imp.default || imp.all;
//         summary.namespace = summary.namespace || imp.namespace || imp.all;
//         summary.named = [...(summary.named || []), ...imp.named];
//         return summary;
//       }, {} as any);
//   }

//   const parsedEntrypoint = parseEntrypoint(entry, isExplicitAutoDetect, logger);
//   const [parsedEsmImports, parsedEsmExports] = parseEsm(entryContent);
//   if (!parsedEsmImports.length && !parsedEsmExports.length) {
//     const scannedNamedExports = isExplicitAutoDetect
//       ? cjsAutoDetectExportsTrusted(entry, logger)
//       : cjsAutoDetectExportsUntrusted(entry, logger);
//     return {
//       specifier: entry,
//       all: true,
//       default: true,
//       namespace: true,
//       named: scannedNamedExports,
//     };
//   }

//   const esmInstallTargetSummary = {
//     specifier: entry,
//     all: true,
//     default: parsedEsmExports.includes('default'),
//     namespace: parsedEsmExports.length > 1 || parsedEsmExports[0] !== 'default',
//     named: [],
//   };

//   // const scannedNamedExports = isExplicitAutoDetect
//   //   ? cjsAutoDetectExportsTrusted(val, logger)
//   //   : cjsAutoDetectExportsUntrusted(val, logger);
//   // console.log(
//   //   val,
//   //   scannedNamedExports && scannedNamedExports.length > 0,
//   //   isTreeshake && !installTargetSummary.all,
//   // );
// }

/*
 * How it works:
 * 1. An array of "install targets" are passed in, describing all known imports + metadata.
 * 2. If isTreeshake: Known imports are marked for tree-shaking by appending 'snowpack-wrap:' to the input value.
 * 3. If autoDetectPackageExports match: Also mark for wrapping, and use automatic export detection.
 * 4. On load, we return a false virtual file for all "snowpack-wrap:" inputs.
 *    a. That virtual file contains only `export ... from 'ACTUAL_FILE_PATH';` exports
 *    b. Rollup uses those exports to drive its tree-shaking algorithm.
 *    c. Rollup uses those exports to inform its "namedExports" for Common.js entrypoints.
 */
export async function createVirtualEntrypoints(
  isTreeshake: boolean,
  autoDetectPackageExports: string[],
  installTargets: InstallTarget[],
  installEntrypoints: {[targetName: string]: string} = {},
  logger: AbstractLogger,
): Promise<{[targetName: string]: string}> {
  const result: {[targetName: string]: string} = {};
  await initESModuleLexer;

  for (let [key, val] of Object.entries(installEntrypoints)) {
    if (isRemoteUrl(val)) {
      continue;
    }
    if (!isJavaScript(val)) {
      continue;
    }
    const normalizedFileLoc = val.split(path.win32.sep).join(path.posix.sep);
    const isExplicitAutoDetect = autoDetectPackageExports.some((p) =>
      normalizedFileLoc.includes(`node_modules/${p}${p.endsWith('.js') ? '' : '/'}`),
    );
    // const installTargetSummary = generateInstallTargetSummary(
    //   key,
    //   installTargets,
    //   isTreeshake,
    //   isExplicitAutoDetect,
    //   logger,
    // );
    const parsedEntrypoint = parseEntrypoint(val, isExplicitAutoDetect, logger);
    // If we are tree-shaking, then update parsedEntrypoint with the tree-shaken values.
    if (isTreeshake) {
      const installTargetsSummary = installTargets
        .filter((imp) => getWebDependencyName(imp.specifier) === key)
        .reduce((summary, imp) => {
          summary.all = summary.all || imp.all;
          summary.default = summary.default || imp.default;
          summary.namespace = summary.namespace || imp.namespace;
          summary.named = [...(summary.named || []), ...imp.named];
          return summary;
        }, {} as any);
        if (!installTargetsSummary.all) {
          installTargetsSummary.named = Array.from(new Set(installTargetsSummary.named));
        parsedEntrypoint.default = installTargetsSummary.default;
        if (!installTargetsSummary.namespace) {
          parsedEntrypoint.named = installTargetsSummary.named;
        }
      }
    }
    // const relativeFileLoc = path.relative(path.join(process.cwd(), 'PKG', key), normalizedFileLoc);

    if (parsedEntrypoint.format === 'esm') {
      result[key] = `
            ${parsedEntrypoint.named.length > 0 ? `export * from '${normalizedFileLoc}';` : ''}
            ${
              parsedEntrypoint.default
                ? `import __esinstall_default_export_for_treeshaking__ from '${normalizedFileLoc}'; export default __esinstall_default_export_for_treeshaking__;`
                : ''
            }
            ${parsedEntrypoint.named.length === 0 && !parsedEntrypoint.default ? `import  '${normalizedFileLoc}';` : ``}
          `;
    } else if (parsedEntrypoint.format === 'cjs') {
      result[key] = `
      const __esinstall_default_export_for_treeshaking__ = require("${normalizedFileLoc}");
        ${`export const {${parsedEntrypoint.named.join(',')}} = '${normalizedFileLoc}';`}
        ${
          parsedEntrypoint.default
            ? `export default __esinstall_default_export_for_treeshaking__;`
            : ''
        }
      `;
    } else {
      throw new Error(`Unexpected parsedEntrypoint format: ${parsedEntrypoint.format}`);
    }
  }

  return result;
}
