import * as colors from 'kleur/colors';
import path from 'path';
import {Plugin} from 'rollup';
import {InstallTarget} from '../scan-imports';

function autoDetectExports(fileLoc: string): string[] | undefined {
  try {
    return Object.keys(require(fileLoc));
  } catch (err) {
    console.error(
      colors.red(`✘ Could not auto-detect exports for ${colors.bold(fileLoc)}\n${err.message}`),
    );
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
  const installTargetsByFile: {[loc: string]: InstallTarget[]} = {};

  function isAutoDetect(normalizedFileLoc: string) {
    return autoDetectPackageExports.some((p) =>
      normalizedFileLoc.includes(`node_modules/${p}${p.endsWith('index.js') ? '' : '/'}`),
    );
  }
  return {
    name: 'snowpack:wrap-install-targets',
    // Mark some inputs for tree-shaking.
    options(inputOptions) {
      const input = inputOptions.input as {[entryAlias: string]: string};
      for (const [key, val] of Object.entries(input)) {
        installTargetsByFile[val] = installTargets.filter((imp) => imp.specifier === key);
        if (
          isTreeshake &&
          installTargetsByFile[val].length > 0 &&
          !installTargetsByFile[val].some((imp) => imp.namespace || imp.all)
        ) {
          input[key] = `snowpack-wrap:${val}`;
        }
        if (!isTreeshake) {
          const normalizedFileLoc = val.split(path.win32.sep).join(path.posix.sep);
          if (isAutoDetect(normalizedFileLoc)) {
            input[key] = `snowpack-wrap:${val}`;
          }
        }
      }
      return inputOptions;
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
      const treeshakeSummary = installTargetsByFile[fileLoc].reduce((summary, imp) => {
        summary.default = summary.default || imp.default;
        summary.namespace = summary.namespace || imp.namespace;
        summary.named = [...summary.named, ...imp.named];
        return summary;
      });
      let uniqueNamedImports = Array.from(new Set(treeshakeSummary.named));
      const normalizedFileLoc = fileLoc.split(path.win32.sep).join(path.posix.sep);
      if (!isTreeshake && isAutoDetect(normalizedFileLoc)) {
        uniqueNamedImports = autoDetectExports(fileLoc) || uniqueNamedImports;
        treeshakeSummary.default = true;
      }
      const result = `
        ${treeshakeSummary.namespace ? `export * from '${normalizedFileLoc}';` : ''}
        ${
          treeshakeSummary.default
            ? `import __pika_web_default_export_for_treeshaking__ from '${normalizedFileLoc}'; export default __pika_web_default_export_for_treeshaking__;`
            : ''
        }
        ${`export {${uniqueNamedImports.join(',')}} from '${normalizedFileLoc}';`}
      `;
      return result;
    },
  };
}
