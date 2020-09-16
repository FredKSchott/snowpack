import * as colors from 'kleur/colors';
import path from 'path';
import {Plugin} from 'rollup';
import {logger} from '../logger';
import {InstallTarget} from '../types';
import {getWebDependencyName} from '../util.js';

function autoDetectExports(fileLoc: string): string[] | undefined {
  try {
    return Object.keys(require(fileLoc)).filter((imp) => imp !== 'default');
  } catch (err) {
    logger.error(`✘ Could not auto-detect exports for ${colors.bold(fileLoc)}
${err.message}`);
  }
}

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
): Plugin {
  const installTargetSummaries: {[loc: string]: InstallTarget} = {};

  function isAutoDetect(normalizedFileLoc: string) {
    return autoDetectPackageExports.some((p) =>
      normalizedFileLoc.includes(`node_modules/${p}${p.endsWith('.js') ? '' : '/'}`),
    );
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
        if (isAutoDetect(normalizedFileLoc)) {
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
      let uniqueNamedImports = Array.from(new Set(installTargetSummary.named));
      const normalizedFileLoc = fileLoc.split(path.win32.sep).join(path.posix.sep);
      if ((!isTreeshake || installTargetSummary.namespace) && isAutoDetect(normalizedFileLoc)) {
        uniqueNamedImports = autoDetectExports(fileLoc) || uniqueNamedImports;
        installTargetSummary.default = true;
      }
      const result = `
        ${installTargetSummary.namespace ? `export * from '${normalizedFileLoc}';` : ''}
        ${
          installTargetSummary.default
            ? `import __pika_web_default_export_for_treeshaking__ from '${normalizedFileLoc}'; export default __pika_web_default_export_for_treeshaking__;`
            : ''
        }
        ${`export {${uniqueNamedImports.join(',')}} from '${normalizedFileLoc}';`}
      `;
      return result;
    },
  };
}
