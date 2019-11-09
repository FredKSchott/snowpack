import {InputOptions} from 'rollup';
import {InstallTarget} from './scan-imports';

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
export function rollupPluginTreeshakeInputs(allImports: InstallTarget[]) {
  const installTargetsByFile: {[loc: string]: InstallTarget[]} = {};
  return {
    name: 'pika:treeshake-inputs',
    // Mark some inputs for tree-shaking.
    options(inputOptions: InputOptions) {
      for (const [key, val] of Object.entries(inputOptions.input)) {
        installTargetsByFile[val] = allImports.filter(imp => imp.specifier === key);
        // If an input has known install targets, and none of those have "all=true", mark for treeshaking.
        if (
          installTargetsByFile[val].length > 0 &&
          !installTargetsByFile[val].some(imp => imp.all)
        ) {
          inputOptions.input[key] = `pika-treeshake:${val}`;
        }
      }
      return inputOptions;
    },
    resolveId(source: string) {
      if (source.startsWith('pika-treeshake:')) {
        return source;
      }
      return null;
    },
    load(id: string) {
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
      const result = `
        ${treeshakeSummary.namespace ? `export * from '${fileLoc}';` : ''}
        ${
          treeshakeSummary.default && !uniqueNamedImports.has('default')
            ? `export {default} from '${fileLoc}';`
            : ''
        }
        ${`export {${[...uniqueNamedImports].join(',')}} from '${fileLoc}';`}
      `;
      return result;
    },
  };
}
