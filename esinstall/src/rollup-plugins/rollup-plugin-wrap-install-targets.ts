import * as colors from 'kleur/colors';
import path from 'path';
import fs from 'fs';
import {Plugin} from 'rollup';
import {InstallTarget, AbstractLogger} from '../types';
import {getWebDependencyName} from '../util.js';
import parse from 'cjs-module-lexer';

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
   */
  function cjsAutoDetectExportsRuntime(normalizedFileLoc: string): string[] | undefined {
    try {
      const mod = require(normalizedFileLoc);
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
  function cjsAutoDetectExportsStatic(filename: string, visited = new Set()): string[] | undefined {
    // Prevent infinite loops via circular dependencies.
    if (visited.has(filename)) {
      return [];
    } else {
      visited.add(filename);
    }
    const fileContents = fs.readFileSync(filename, 'utf-8');
    try {
      const {exports, reexports} = parse(fileContents);
      const resolvedReexports = reexports.map((e) =>
        cjsAutoDetectExportsStatic(require.resolve(e, {paths: [path.dirname(filename)]}), visited),
      );
      return Array.from(new Set([...exports, ...resolvedReexports])).filter(
        (imp) => imp !== 'default' && imp !== '__esModule',
      );
    } catch (err) {
      // Safe to ignore, this is usually due to the file not being CJS.
      logger.debug(`cjsAutoDetectExportsStatic error: ${err.message}`);
    }
  }

  return {
    name: 'snowpack:wrap-install-targets',
    // Mark some inputs for tree-shaking.
    buildStart(inputOptions) {
      const input = inputOptions.input as {[entryAlias: string]: string};
      for (const [key, val] of Object.entries(input)) {
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
          ? cjsAutoDetectExportsRuntime(val)
          : cjsAutoDetectExportsStatic(val);
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
