import {Plugin} from 'rollup';
import {InstallTarget} from './scan-imports';
import path from 'path';

/**
 * rollup-plugin-treeshake-inputs
 *
 * How it works:
 * 1. An array of "install targets" are passed in, describing all known imports + metadata.
 * 2. Known imports are marked for tree-shaking by appending 'pika-treeshake:' to the input value.
 * 3. On load, we return a false virtual file for all "pika-treeshake:" inputs.
 *    a. That virtual file contains only `export ... from 'ACTUAL_FILE_PATH';` exports
 *    b. Rollup uses those exports to drive its tree-shaking algorithm.
 */
export function rollupPluginTreeshakeInputs(allImports: InstallTarget[]): Plugin {
  const installTargetsByFile: {[loc: string]: InstallTarget[]} = {};
  return {
    name: 'pika:treeshake-inputs',
    // Mark some inputs for tree-shaking.
    options(inputOptions) {
      const input = inputOptions.input as {[entryAlias: string]: string};
      for (const [key, val] of Object.entries(input)) {
        installTargetsByFile[val] = allImports.filter(imp => imp.specifier === key);
        // If an input has known install targets, and none of those have "all=true", mark for treeshaking.
        if (
          installTargetsByFile[val].length > 0 &&
          !installTargetsByFile[val].some(imp => imp.all)
        ) {
          input[key] = `pika-treeshake:${val}`;
        }
      }
      return inputOptions;
    },
    resolveId(source) {
      if (source.startsWith('pika-treeshake:')) {
        return source;
      }
      return null;
    },
    load(id) {
      if (!id.startsWith('pika-treeshake:')) {
        return null;
      }
      const fileLoc = id.substring('pika-treeshake:'.length);
      // Reduce all install targets into a single "summarized" install target.
      const treeshakeSummary = installTargetsByFile[fileLoc].reduce((summary, imp) => {
        summary.default = summary.default || imp.default;
        summary.namespace = summary.namespace || imp.namespace;
        summary.named = [...summary.named, ...imp.named];
        return summary;
      });
      const uniqueNamedImports = new Set(treeshakeSummary.named);
      const normalizedFileLoc = fileLoc.split(path.win32.sep).join(path.posix.sep);
      const result = `
        ${treeshakeSummary.namespace ? `export * from '${normalizedFileLoc}';` : ''}
        ${
          treeshakeSummary.default
            ? `import __pika_web_default_export_for_treeshaking__ from '${normalizedFileLoc}'; export default __pika_web_default_export_for_treeshaking__;`
            : ''
        }
        ${`export {${[...uniqueNamedImports].join(',')}} from '${normalizedFileLoc}';`}
      `;
      return result;
    },
  };
}
